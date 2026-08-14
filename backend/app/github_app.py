import base64
import calendar
import io
import json
import time
import uuid
import zipfile

import httpx
import jwt
import yaml
from fastapi import HTTPException, status

from app.config import CI_REPORT_ARTIFACT_NAME, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_WORKFLOW_NAME_HINT

GITHUB_API_URL = "https://api.github.com"


_installation_token_cache: dict[int, tuple[str, float]] = {}


def _require_app_credentials() -> None:
    if not GITHUB_APP_ID or not GITHUB_APP_PRIVATE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub App is not configured.",
        )


def generate_app_jwt() -> str:
    _require_app_credentials()
    now = int(time.time())
    payload = {
        "iat": now - 60,
        "exp": now + 540,
        "iss": GITHUB_APP_ID,
    }
    return jwt.encode(payload, GITHUB_APP_PRIVATE_KEY, algorithm="RS256")


async def get_installation_id_for_account(owner: str) -> int:
    """Resolve the App installation for `owner`, which may be an org or a personal account —
    GitHub exposes these under different endpoints, so try org first and fall back to user.
    """
    app_jwt = generate_app_jwt()
    headers = {"Authorization": f"Bearer {app_jwt}", "Accept": "application/vnd.github+json"}
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{GITHUB_API_URL}/orgs/{owner}/installation", headers=headers)
        if res.status_code != 200:
            res = await client.get(f"{GITHUB_API_URL}/users/{owner}/installation", headers=headers)
    if res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"GitHub App is not installed on '{owner}'.",
        )
    return res.json()["id"]


async def get_installation_token(installation_id: int) -> str:
    cached = _installation_token_cache.get(installation_id)
    if cached and cached[1] - 60 > time.time():
        return cached[0]

    app_jwt = generate_app_jwt()
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{GITHUB_API_URL}/app/installations/{installation_id}/access_tokens",
            headers={"Authorization": f"Bearer {app_jwt}", "Accept": "application/vnd.github+json"},
        )
    if res.status_code != 201:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to mint GitHub App installation token.",
        )
    data = res.json()
    token = data["token"]
    expires_at = calendar.timegm(time.strptime(data["expires_at"], "%Y-%m-%dT%H:%M:%SZ"))
    _installation_token_cache[installation_id] = (token, expires_at)
    return token


async def list_repo_workflows(org: str, repo: str, token: str) -> list[dict]:
    workflows: list[dict] = []
    page = 1
    async with httpx.AsyncClient() as client:
        while True:
            res = await client.get(
                f"{GITHUB_API_URL}/repos/{org}/{repo}/actions/workflows",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
                params={"per_page": 100, "page": page},
            )
            if res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to list workflows for {org}/{repo}: {res.text}",
                )
            data = res.json()
            workflows.extend(data.get("workflows", []))
            if len(workflows) >= data.get("total_count", 0) or not data.get("workflows"):
                break
            page += 1
    return workflows


async def find_scan_workflow(
    org: str, repo: str, token: str, name_hint: str = GITHUB_WORKFLOW_NAME_HINT
) -> dict:
    """Pick the repo's security-scan workflow by asking GitHub what workflows it has,
    rather than assuming every repo names its workflow file the same thing.

    Most connected repos only register one workflow, so that one is used outright.
    `name_hint` only comes into play to disambiguate when a repo has several.
    """
    workflows = await list_repo_workflows(org, repo, token)
    active = [w for w in workflows if w.get("state") == "active"]

    if not active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active workflows found in {org}/{repo}.",
        )
    if len(active) == 1:
        return active[0]

    hint = name_hint.lower()
    for w in active:
        if hint in w.get("name", "").lower() or hint in w.get("path", "").lower():
            return w

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=(
            f"{org}/{repo} has multiple workflows and none match '{name_hint}'. "
            f"Available workflows: {[w.get('name') for w in active]}"
        ),
    )


async def list_branch_workflow_files(org: str, repo: str, ref: str, token: str) -> list[dict]:
    """Workflow files actually present in `.github/workflows` at `ref` -- a branch can add,
    rename, or remove workflow files the repo's default branch doesn't have, so the picker
    needs to reflect what that specific branch would run, not the repo as a whole.
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{GITHUB_API_URL}/repos/{org}/{repo}/contents/.github/workflows",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            params={"ref": ref},
        )
    if res.status_code == 404:
        return []
    if res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to list workflow files for {org}/{repo}@{ref}: {res.text}",
        )
    items = res.json()
    if not isinstance(items, list):
        return []
    return [item for item in items if item.get("type") == "file" and item.get("name", "").endswith((".yml", ".yaml"))]


async def list_repo_workflows_for_branch(org: str, repo: str, ref: str, token: str) -> list[dict]:
    """Workflows selectable for a scan on `ref`: the branch's own workflow files, enriched
    with the id/name/state GitHub's Actions API knows about them where it has already
    registered that file (a brand-new file on a feature branch may not be registered yet).
    """
    files = await list_branch_workflow_files(org, repo, ref, token)
    if not files:
        return []

    registered = await list_repo_workflows(org, repo, token)
    by_path = {w.get("path"): w for w in registered}

    result = []
    for f in files:
        path = f.get("path")
        w = by_path.get(path)
        result.append(
            {
                "id": w["id"] if w else None,
                "name": w.get("name") if w else f.get("name"),
                "path": path,
                "state": w.get("state") if w else "unregistered",
            }
        )
    return result


async def get_workflow_dispatch_inputs(org: str, repo: str, path: str, ref: str, token: str) -> dict:
    """Read a workflow file's own `on.workflow_dispatch.inputs` schema from GitHub.

    GitHub's dispatch API rejects both missing required inputs and unrecognized ones, so
    the only way to call an arbitrary repo's workflow correctly is to read what it actually
    declares instead of assuming a fixed set of input names.
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{GITHUB_API_URL}/repos/{org}/{repo}/contents/{path}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            params={"ref": ref},
        )
    if res.status_code != 200:
        return {}

    try:
        raw = base64.b64decode(res.json()["content"]).decode("utf-8")
        workflow_def = yaml.safe_load(raw) or {}
    except Exception:
        return {}


    on_section = workflow_def.get("on", workflow_def.get(True, {}))
    if not isinstance(on_section, dict):
        return {}
    dispatch = on_section.get("workflow_dispatch")
    if not isinstance(dispatch, dict):
        return {}
    declared_inputs = dispatch.get("inputs")
    return declared_inputs if isinstance(declared_inputs, dict) else {}


def _autofill_input(name: str, spec: dict) -> str:
    """Best-effort value for a required input we have no candidate value for."""
    input_type = (spec or {}).get("type", "string")
    if input_type == "boolean":
        return "true"
    if input_type == "choice":
        options = spec.get("options") or []
        return options[0] if options else ""
    if "id" in name.lower():
        return str(uuid.uuid4())
    return ""


async def trigger_workflow(
    org: str,
    repo: str,
    ref: str,
    workflow_id: int | str | None = None,
    workflow_path: str | None = None,
    candidate_inputs: dict | None = None,
) -> None:
    """Fire a workflow_dispatch event, kicking off the repo's security-scan workflow for a push.

    Requires the GitHub App to hold the "Actions: write" permission on the repo and to
    be installed on `org`; the target workflow must accept `workflow_dispatch`. If
    `workflow_id`/`workflow_path` aren't given, the workflow is discovered by listing the
    repo's workflows and matching against GITHUB_WORKFLOW_NAME_HINT.

    `candidate_inputs` are values we'd *like* to pass (e.g. scan_id, triggered_by) — only
    the ones the workflow actually declares are sent; any other required input the workflow
    defines gets a best-effort autofilled value so the dispatch doesn't 422.
    """
    installation_id = await get_installation_id_for_account(org)
    token = await get_installation_token(installation_id)

    if workflow_path is None:
        workflow = await find_scan_workflow(org, repo, token)
        workflow_id = workflow["id"]
        workflow_path = workflow.get("path")
    elif workflow_id is None:
       
        workflow_id = workflow_path.rsplit("/", 1)[-1]

    declared = await get_workflow_dispatch_inputs(org, repo, workflow_path, ref, token) if workflow_path else {}
    candidate_inputs = candidate_inputs or {}

    inputs = {}
    for name, spec in declared.items():
        if name in candidate_inputs:
            inputs[name] = str(candidate_inputs[name])
        elif spec.get("required") and spec.get("default") is None:
            inputs[name] = _autofill_input(name, spec)
      

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{GITHUB_API_URL}/repos/{org}/{repo}/actions/workflows/{workflow_id}/dispatches",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            json={"ref": ref, "inputs": inputs},
        )
    if res.status_code != 204:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to trigger workflow '{workflow_id}' for {org}/{repo}: {res.text}",
        )


async def list_run_artifacts(org: str, repo: str, run_id: int, token: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{GITHUB_API_URL}/repos/{org}/{repo}/actions/runs/{run_id}/artifacts",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            params={"per_page": 100},
        )
    if res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to list artifacts for run {run_id} in {org}/{repo}: {res.text}",
        )
    return res.json().get("artifacts", [])


def find_report_artifact(artifacts: list[dict]) -> dict | None:
    """Pick out the consolidated `CI_REPORT_ARTIFACT_NAME` artifact (if any) from a run's
    artifact list, ignoring the per-job scan-result.json artifacts.
    """
    for artifact in artifacts:
        if artifact.get("name") == CI_REPORT_ARTIFACT_NAME:
            return artifact
    return None


async def _download_artifact_zip(org: str, repo: str, artifact_id: int, token: str) -> zipfile.ZipFile:
    async with httpx.AsyncClient(follow_redirects=True) as client:
        res = await client.get(
            f"{GITHUB_API_URL}/repos/{org}/{repo}/actions/artifacts/{artifact_id}/zip",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        )
    if res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to download artifact {artifact_id} for {org}/{repo}: status {res.status_code}",
        )
    return zipfile.ZipFile(io.BytesIO(res.content))


async def download_artifact_json(org: str, repo: str, artifact_id: int, token: str, filename: str) -> dict | None:
    """Download a workflow-run artifact (a zip) and return `filename`'s contents as JSON,
    or None if that file isn't in the archive.
    """
    with await _download_artifact_zip(org, repo, artifact_id, token) as zf:
        if filename not in zf.namelist():
            return None
        return json.loads(zf.read(filename))



_ZAP_REPORT_FILENAMES = ("report_json.json", "zap_report.json")


async def download_zap_report_json(org: str, repo: str, artifact_id: int, token: str) -> dict | None:
    """Look for a ZAP JSON report inside a workflow-run artifact. ZAP's own GitHub Actions
    publish their report bundle (HTML/MD/JSON) rather than this app's scan-result.json
    convention, so this is matched by the report's own filename instead.
    """
    with await _download_artifact_zip(org, repo, artifact_id, token) as zf:
        names = zf.namelist()
        for candidate in _ZAP_REPORT_FILENAMES:
            match = next((n for n in names if n.endswith(candidate)), None)
            if match:
                return json.loads(zf.read(match))
    return None
