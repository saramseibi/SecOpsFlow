import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import String, case, func, or_
from sqlalchemy.orm import Session

from app.access import get_user_accessible_logins, repo_scope_clause
from app.database import get_db
from app.github_app import (
    download_artifact_json,
    find_report_artifact,
    get_installation_id_for_account,
    get_installation_token,
    list_run_artifacts,
)
from app.scan_service import apply_artifact_metadata
from models.repository import Repository
from models.scan import Scan
from models.user import User
from routes.auth import get_current_user
from shemas.schemas import ScanListOut, ScanOut, ScansSummaryOut

router = APIRouter(prefix="/api/scans", tags=["scans"])



async def _verify_explicit_filters(
    current_user: User, account: str | None, repository_id: str | None, db: Session, logins: set[str]
) -> None:
    """Never trust an account login or repository id supplied by the client -- confirm
    it's actually one the authenticated user can see on GitHub (their own login, or an
    org they belong to) before it's used to scope a query.
    """
    if repository_id:
        repo = db.query(Repository).filter(Repository.id == repository_id).first()
        if repo is None or repo.org not in logins:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this repository.")
    elif account and account not in logins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this account.")


def _apply_filters(
    query,
    *,
    account: str | None,
    repository_id: str | None,
    status_filter: str | None,
    trigger: str | None,
    search: str | None,
    logins: set[str],
):
    query = query.filter(repo_scope_clause(Scan.repository, logins))
    if repository_id:
        query = query.filter(Scan.repository_id == repository_id)
    elif account:
        # Scan.repository is the denormalized "owner/repo" full name, so an account
        # (personal login or org login) filter is a prefix match on it -- no join needed.
        query = query.filter(Scan.repository.like(f"{account}/%"))
    if status_filter:
        query = query.filter(Scan.status == status_filter)
    if trigger:
        query = query.filter(Scan.trigger == trigger)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Scan.repository.ilike(like),
                Scan.commit_sha.ilike(like),
                Scan.branch.ilike(like),
                func.cast(Scan.scan_number, String).ilike(like),
            )
        )
    return query


@router.get("", response_model=ScanListOut)
async def list_scans(
    account: str | None = Query(None),
    repository_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    trigger: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logins = await get_user_accessible_logins(current_user, db)
    await _verify_explicit_filters(current_user, account, repository_id, db, logins)
    query = _apply_filters(
        db.query(Scan),
        account=account,
        repository_id=repository_id,
        status_filter=status_filter,
        trigger=trigger,
        search=search,
        logins=logins,
    )
    total = query.count()
    items = (
        query.order_by(Scan.started_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return ScanListOut(items=[ScanOut.model_validate(s) for s in items], total=total)


@router.get("/summary", response_model=ScansSummaryOut)
async def get_scans_summary(
    account: str | None = Query(None),
    repository_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    trigger: str | None = Query(None),
    search: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logins = await get_user_accessible_logins(current_user, db)
    await _verify_explicit_filters(current_user, account, repository_id, db, logins)
    query = _apply_filters(
        db.query(Scan),
        account=account,
        repository_id=repository_id,
        status_filter=status_filter,
        trigger=trigger,
        search=search,
        logins=logins,
    )

    # Aggregate in SQL rather than loading every matching row into Python.
    row = query.with_entities(
        func.count(Scan.id),
        func.sum(case((Scan.status == "completed", 1), else_=0)),
        func.sum(case((Scan.status == "failed", 1), else_=0)),
        func.sum(case((Scan.status == "running", 1), else_=0)),
        func.avg(Scan.duration_seconds),
        func.sum(Scan.total_vulnerabilities),
    ).one()
    total, completed, failed, running, avg_duration, total_findings = row

    return ScansSummaryOut(
        total=total or 0,
        completed=completed or 0,
        failed=failed or 0,
        running=running or 0,
        avg_duration_seconds=round(avg_duration) if avg_duration else 0,
        total_findings=total_findings or 0,
    )


async def _get_owned_scan(scan_id: str, current_user: User, db: Session) -> Scan:
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")

    logins = await get_user_accessible_logins(current_user, db)
    owner = scan.repository.split("/", 1)[0]
    if owner not in logins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this scan.")
    return scan


@router.get("/{scan_id}", response_model=ScanOut)
async def get_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Single-scan lookup used by the Scan Overview page and to poll a just-triggered
    scan's status until it leaves "running", since scan completion arrives via an async
    GitHub webhook.
    """
    scan = await _get_owned_scan(scan_id, current_user, db)
    return ScanOut.model_validate(scan)


@router.post("/{scan_id}/artifact/refresh", response_model=ScanOut)
async def refresh_artifact_status(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-query GitHub for the run's `ci-security-report` artifact and update its tracked
    status/size/expiry -- used by the Scan Overview page's "Refresh artifact status" action,
    since an artifact can go from available to expired without any webhook firing.
    """
    scan = await _get_owned_scan(scan_id, current_user, db)
    if not scan.workflow_run_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This scan has no associated workflow run yet.")

    org, _, repo = scan.repository.partition("/")
    try:
        installation_id = await get_installation_id_for_account(org)
        token = await get_installation_token(installation_id)
        artifacts = await list_run_artifacts(org, repo, int(scan.workflow_run_id), token)
        apply_artifact_metadata(db, scan, find_report_artifact(artifacts), run_completed=scan.status != "running")
    except HTTPException:
        scan.artifact_status = "download_failed"
        scan.artifact_last_checked_at = datetime.now(timezone.utc)
        db.add(scan)
        db.commit()

    db.refresh(scan)
    return ScanOut.model_validate(scan)


@router.get("/{scan_id}/artifact/download")
async def download_artifact(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream the `ci-security-report` artifact's JSON straight from GitHub -- it's never
    persisted server-side, only its metadata (size/expiry/status) is.
    """
    scan = await _get_owned_scan(scan_id, current_user, db)
    if scan.artifact_status != "available" or not scan.workflow_run_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact is not available for download.")

    org, _, repo = scan.repository.partition("/")
    installation_id = await get_installation_id_for_account(org)
    token = await get_installation_token(installation_id)
    artifacts = await list_run_artifacts(org, repo, int(scan.workflow_run_id), token)
    artifact = find_report_artifact(artifacts)
    if artifact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found on GitHub.")

    filename = scan.artifact_file_name or "ci-security-report.json"
    content = await download_artifact_json(org, repo, artifact["id"], token, filename)
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact archive did not contain the expected file.")

    return Response(
        content=json.dumps(content, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
