import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.access import clear_github_connection, get_accessible_logins, get_valid_github_token, reject_dead_token
from app.config import GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_DAST_WORKFLOW_NAME_HINTS
from app.database import get_db
from app.github_app import list_repo_workflows_for_branch, trigger_workflow
from app.scan_service import create_pending_scan, finalize_scan, get_or_create_repository
from models.repository import Repository
from models.scan import Scan
from models.user import User
from routes.auth import get_current_user
from shemas.github import ConnectIn, RepoOut, OrgOut, RepoWorkflowOut, ScanTriggerIn

router = APIRouter(prefix="/api/github", tags=["github"])

GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_URL = "https://api.github.com"


async def _require_connected(user: User, db: Session) -> str:
    return await get_valid_github_token(user, db)


@router.post("/connect", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def connect(body: ConnectIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="GitHub OAuth is not configured.")

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": body.code,
                "redirect_uri": body.redirect_uri,
            },
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to exchange code with GitHub.")

        user_res = await client.get(
            f"{GITHUB_API_URL}/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
        if user_res.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch GitHub profile.")
        gh_user = user_res.json()

    now = datetime.now(timezone.utc)
    current_user.github_id = str(gh_user.get("id"))
    current_user.github_username = gh_user.get("login")
    current_user.github_avatar_url = gh_user.get("avatar_url")
    current_user.github_access_token = access_token
    current_user.github_connected_at = now
    current_user.github_refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in")
    current_user.github_token_expires_at = now + timedelta(seconds=int(expires_in)) if expires_in else None
    refresh_expires_in = token_data.get("refresh_token_expires_in")
    current_user.github_refresh_token_expires_at = (
        now + timedelta(seconds=int(refresh_expires_in)) if refresh_expires_in else None
    )
    db.add(current_user)
    db.commit()


@router.delete("/disconnect", status_code=status.HTTP_204_NO_CONTENT)
def disconnect(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    clear_github_connection(current_user, db)


@router.get("/orgs", response_model=list[OrgOut])
async def list_orgs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    token = await _require_connected(current_user, db)
    async with httpx.AsyncClient() as client:
        member_res = await client.get(
            f"{GITHUB_API_URL}/user/orgs",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            params={"per_page": 100},
        )
        reject_dead_token(member_res, current_user, db)
        if member_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch organizations from GitHub."
            )

        # /user/orgs only lists orgs the signed-in user is a full member of -- it misses
        # orgs where they've only been granted access to specific repos (e.g. added as an
        # outside collaborator, or a member without public/read:org org visibility). Those
        # are recovered from the distinct organization owners among the repos GitHub says
        # this token can actually reach, so a repo share always makes its org selectable.
        collab_res = await client.get(
            f"{GITHUB_API_URL}/user/repos",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            params={"per_page": 100, "affiliation": "collaborator,organization_member"},
        )

    orgs = {org["login"]: org.get("avatar_url") for org in member_res.json()}
    if collab_res.status_code == 200:
        for repo in collab_res.json():
            owner = repo.get("owner") or {}
            if owner.get("type") == "Organization" and owner.get("login") not in orgs:
                orgs[owner["login"]] = owner.get("avatar_url")

    return [{"login": login, "avatar_url": avatar_url} for login, avatar_url in orgs.items()]


PERSONAL_ORG = "__personal__"


@router.get("/repos", response_model=list[RepoOut])
async def list_repos(org: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    token = await _require_connected(current_user, db)
    async with httpx.AsyncClient() as client:
        if org == PERSONAL_ORG:
            res = await client.get(
                f"{GITHUB_API_URL}/user/repos",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
                params={"per_page": 100, "sort": "full_name", "affiliation": "owner"},
            )
        else:
            res = await client.get(
                f"{GITHUB_API_URL}/orgs/{org}/repos",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
                params={"per_page": 100, "sort": "full_name"},
            )
    reject_dead_token(res, current_user, db)
    if res.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch repositories from GitHub.")

    github_repos = res.json()

    # Upsert a Repository row for every repo the user can see (not just ones already
    # scanned), so the frontend always has a real internal id to filter/scan by --
    # never the GitHub id, name, or full_name, which the backend never accepts as such.
    result = []
    for repo in github_repos:
        repository = get_or_create_repository(
            db, repo["full_name"], default_branch=repo.get("default_branch", "main")
        )
        result.append(
            {
                "db_id": repository.id,
                "github_id": repo["id"],
                "name": repo["name"],
                "full_name": repo["full_name"],
                "owner": repo["full_name"].split("/", 1)[0],
                "private": repo["private"],
                "default_branch": repo.get("default_branch", "main"),
            }
        )
    return result


@router.get("/repos/branches")
async def list_branches(
    repository_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Branches a repo actually has on GitHub, for the "Run Scan Now" branch picker --
    lets a scan be dispatched against any branch, not just the repo's default one.
    """
    token = await _require_connected(current_user, db)

    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if repository is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    accessible = await get_accessible_logins(token, current_user.github_username)
    if repository.org not in accessible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this repository."
        )

    org, repo = repository.full_name.split("/", 1)
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{GITHUB_API_URL}/repos/{org}/{repo}/branches",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            params={"per_page": 100},
        )
    reject_dead_token(res, current_user, db)
    if res.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch branches from GitHub.")

    names = [b["name"] for b in res.json()]
    
    names.sort(key=lambda n: (n != repository.default_branch, n))
    return {"default_branch": repository.default_branch, "branches": names}


@router.get("/repos/workflows", response_model=list[RepoWorkflowOut])
async def list_branch_workflows(
    repository_id: str, branch: str | None = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Workflows defined on a specific branch, for the "Run Scan Now" workflow picker --
    different branches can carry different workflow files, so this is scoped per-branch
    rather than to the repo as a whole.
    """
    token = await _require_connected(current_user, db)

    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if repository is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    accessible = await get_accessible_logins(token, current_user.github_username)
    if repository.org not in accessible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this repository."
        )

    org, repo = repository.full_name.split("/", 1)
    ref = branch or repository.default_branch
    return await list_repo_workflows_for_branch(org, repo, ref, token)


@router.post("/repos/scan", status_code=status.HTTP_202_ACCEPTED)
async def trigger_manual_scan(
    body: ScanTriggerIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually kick off a scan for one repo (the "Run Scan Now" button), rather than
    waiting for the next push. Dispatches through the GitHub App the same way the push
    webhook does, so it works regardless of which OAuth account is signed in.

    Only ever takes the repository's internal database id -- never its GitHub id or
    name -- and verifies the requesting user actually has access to it before doing
    anything. A "running" Scan row is created up front, keyed by the scan_id we hand
    the workflow; if the dispatch itself fails (e.g. the repo has no workflow that
    accepts workflow_dispatch), that row is immediately finalized as "failed" instead of
    being left stuck at "running" forever -- otherwise nothing else will ever mark it
    done, since no workflow_run webhook will ever arrive for a run that never started.
    """
    token = await _require_connected(current_user, db)

    repository = db.query(Repository).filter(Repository.id == body.repository_id).first()
    if repository is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    accessible = await get_accessible_logins(token, current_user.github_username)
    if repository.org not in accessible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this repository."
        )

    org, repo = repository.full_name.split("/", 1)
    branch = body.branch or repository.default_branch

    async with httpx.AsyncClient() as client:
        commit_res = await client.get(
            f"{GITHUB_API_URL}/repos/{org}/{repo}/commits/{branch}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        )
        if commit_res.status_code != 200:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Branch '{branch}' not found.")
        commit_sha = commit_res.json()["sha"]

    
    selected_workflow_text = (body.workflow_path or "").lower()
    is_dast_workflow = any(hint in selected_workflow_text for hint in GITHUB_DAST_WORKFLOW_NAME_HINTS)

    scan_id = str(uuid.uuid4())
    create_pending_scan(
        db,
        scan_id=scan_id,
        repository=repository,
        branch=branch,
        commit_sha=commit_sha,
        trigger="manual",
        author=current_user.email,
        dast_only=is_dast_workflow,
    )

    try:
        await trigger_workflow(
            org,
            repo,
            ref=branch,
            workflow_id=body.workflow_id,
            workflow_path=body.workflow_path,
            candidate_inputs={
                "scan_id": scan_id,
                "trigger": "manual",
                "triggered_by": current_user.email,
            },
        )
    except HTTPException as exc:
        finalize_scan(db, db.query(Scan).filter(Scan.id == scan_id).first(), status="failed")
        raise HTTPException(
            status_code=exc.status_code, detail=f"Scan could not be started: {exc.detail}"
        ) from exc

    return {"scan_id": scan_id}
