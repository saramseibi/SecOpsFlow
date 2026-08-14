import hashlib
import hmac
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import GITHUB_DAST_WORKFLOW_NAME_HINTS, GITHUB_WEBHOOK_SECRET
from app.database import get_db
from app.github_app import (
    download_artifact_json,
    download_zap_report_json,
    find_report_artifact,
    get_installation_id_for_account,
    get_installation_token,
    list_run_artifacts,
    trigger_workflow,
)
from app.scan_service import (
    apply_artifact_metadata,
    apply_dast_artifact_metadata,
    apply_dast_workflow_run_metadata,
    apply_workflow_run_metadata,
    create_pending_scan,
    finalize_scan,
    get_or_create_repository,
    ingest_scan_result,
    ingest_zap_result,
)
from models.scan import Scan

router = APIRouter(prefix="/api/github", tags=["github-webhook"])


def _verify_signature(payload: bytes, signature_header: str | None) -> None:
    if not GITHUB_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub webhook secret is not configured.",
        )
    if not signature_header or not signature_header.startswith("sha256="):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing signature.")

    expected = hmac.new(GITHUB_WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    received = signature_header.removeprefix("sha256=")
    if not hmac.compare_digest(expected, received):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature.")


_PR_TRIGGER_ACTIONS = {"opened", "synchronize", "reopened"}


async def _handle_pull_request(event: dict, db: Session) -> None:
    """Auto-trigger a scan the moment a PR is opened or gets new commits, keyed off the
    PR's head branch/sha. No repo/branch selection from the UI is involved -- this fires
    purely off the webhook, and is the only auto-trigger left (plain pushes no longer
    kick off a scan, since that fired on every commit and was too noisy).
    """
    action = event.get("action")
    if action not in _PR_TRIGGER_ACTIONS:
        return

    pr = event.get("pull_request", {})
    repository = event.get("repository", {})
    full_name = repository.get("full_name")
    org = repository.get("owner", {}).get("login")
    repo = repository.get("name")
    head = pr.get("head", {})
    branch = head.get("ref")
    commit_sha = head.get("sha")
    pr_number = event.get("number")
    author = pr.get("user", {}).get("login")

    if not (org and repo and branch and commit_sha and pr_number):
        print(f"[github webhook] ignoring pull_request event for {full_name} (missing data)")
        return

    print(f"[github webhook] PR #{pr_number} {action} on {full_name}@{branch}, triggering scan workflow")

    scan_id = str(uuid.uuid4())
    repository_row = get_or_create_repository(db, full_name, default_branch=repository.get("default_branch", branch))
    create_pending_scan(
        db,
        scan_id=scan_id,
        repository=repository_row,
        branch=branch,
        commit_sha=commit_sha,
        trigger="pr",
        author=author,
        pr_number=pr_number,
    )

    try:
        await trigger_workflow(
            org,
            repo,
            ref=branch,
            candidate_inputs={
                "scan_id": scan_id,
                "trigger": "pr",
                "commit_sha": commit_sha,
                "pr_number": str(pr_number),
            },
        )
    except HTTPException as exc:
        print(f"[github webhook] failed to trigger workflow for {full_name} PR #{pr_number}: {exc.detail}")
        finalize_scan(db, db.query(Scan).filter(Scan.id == scan_id).first(), status="failed")


def _is_dast_run(run: dict) -> bool:
    name = (run.get("name") or "").lower()
    path = (run.get("path") or "").lower()
    return any(hint in name or hint in path for hint in GITHUB_DAST_WORKFLOW_NAME_HINTS)


def _find_scan_for_run(db: Session, event: dict) -> Scan | None:
    run = event.get("workflow_run", {})
    repository = event.get("repository", {})
    full_name = repository.get("full_name")
    head_sha = run.get("head_sha")
    if not (full_name and head_sha):
        return None
    return (
        db.query(Scan)
        .filter(Scan.repository == full_name, Scan.commit_sha == head_sha)
        .order_by(Scan.started_at.desc())
        .first()
    )


async def _handle_dast_workflow_run_started(event: dict, db: Session) -> None:
    """Mark a DAST run as in-flight as soon as GitHub reports it running, so the Scan
    Overview's DAST row shows "Running" instead of "Skipped" while it's in progress --
    mirroring the primary workflow, whose scan.status is already "running" from dispatch.
    """
    run = event.get("workflow_run", {})
    run_id = run.get("id")
    if run_id is None:
        return

    scan = _find_scan_for_run(db, event)
    if scan is None:
        return

    apply_dast_workflow_run_metadata(
        scan, workflow_run_id=run_id, run_attempt=run.get("run_attempt"), workflow_name=run.get("name")
    )
    scan.dast_status = "running"
    db.add(scan)
    db.commit()


async def _handle_dast_workflow_run(event: dict, db: Session) -> None:
    """DAST counterpart of `_handle_workflow_run`. The DAST workflow is never dispatched
    by this app (see GITHUB_DAST_WORKFLOW_NAME_HINT), so there's no scan_id embedded in its
    run-name to look the Scan up by -- instead it's matched onto the most recent Scan for
    the same repository + commit sha. If no such Scan exists yet, the run is dropped; DAST
    is only ever attached onto a scan the security-scan workflow already created.
    """
    run = event.get("workflow_run", {})
    repository = event.get("repository", {})
    org = repository.get("owner", {}).get("login")
    repo = repository.get("name")
    full_name = repository.get("full_name")
    run_id = run.get("id")
    conclusion = run.get("conclusion")
    head_sha = run.get("head_sha")

    if not (org and repo and full_name and run_id and head_sha):
        print("[github webhook] DAST workflow_run completed but missing repo/commit info")
        return

    scan = _find_scan_for_run(db, event)
    if scan is None:
        print(f"[github webhook] no scan found for {full_name}@{head_sha}, ignoring DAST run {run_id}")
        return

    apply_dast_workflow_run_metadata(
        scan,
        workflow_run_id=run_id,
        run_attempt=run.get("run_attempt"),
        workflow_name=run.get("name"),
    )
    db.add(scan)
    db.commit()

    try:
        installation_id = await get_installation_id_for_account(org)
        token = await get_installation_token(installation_id)
        artifacts = await list_run_artifacts(org, repo, run_id, token)

        found_result = False
        for artifact in artifacts:
            result = await download_artifact_json(org, repo, artifact["id"], token, "scan-result.json")
            if result is not None:
                ingest_scan_result(db, scan, result)
                found_result = True
                continue

            
            zap_result = await download_zap_report_json(org, repo, artifact["id"], token)
            if zap_result is not None:
                ingest_zap_result(db, scan, zap_result)
                found_result = True

        apply_dast_artifact_metadata(db, scan, find_report_artifact(artifacts), run_completed=True)
        scan.dast_status = "completed" if (found_result or conclusion == "success") else "failed"
        db.add(scan)
        db.commit()
        print(f"[github webhook] ingested DAST results for scan {scan.id} ({'ok' if found_result else 'no result artifact found'})")
    except HTTPException as exc:
        print(f"[github webhook] failed to retrieve DAST results for scan {scan.id}: {exc.detail}")
        scan.dast_status = "failed"
        db.add(scan)
        db.commit()

    
    if scan.dast_only and scan.status == "running":
        finalize_scan(db, scan, status="completed" if scan.dast_status == "completed" else "failed")


async def _handle_workflow_run(event: dict, db: Session) -> None:
    """Once GitHub reports a dispatched run as completed, pull its scan-result.json
    artifact(s) and attach the findings to the Scan row created when it was dispatched.
    """
    action = event.get("action")
    run = event.get("workflow_run", {})

    if _is_dast_run(run):
        if action == "in_progress":
            await _handle_dast_workflow_run_started(event, db)
        elif action == "completed":
            await _handle_dast_workflow_run(event, db)
        return

    if action != "completed":
        return

    repository = event.get("repository", {})
    org = repository.get("owner", {}).get("login")
    repo = repository.get("name")
    run_id = run.get("id")
    conclusion = run.get("conclusion")

    
    display_title = run.get("display_title") or run.get("name") or ""
    scan_id = display_title.rsplit(" - ", 1)[-1].strip() if " - " in display_title else None

    if not (org and repo and run_id and scan_id):
        print(f"[github webhook] workflow_run completed but couldn't extract scan_id from '{display_title}'")
        return

    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if scan is None:
        print(f"[github webhook] no pending scan found for scan_id={scan_id}, ignoring")
        return

    apply_workflow_run_metadata(
        scan,
        workflow_run_id=run_id,
        run_attempt=run.get("run_attempt"),
        workflow_name=run.get("name"),
    )

    try:
        installation_id = await get_installation_id_for_account(org)
        token = await get_installation_token(installation_id)
        artifacts = await list_run_artifacts(org, repo, run_id, token)

        found_result = False
        for artifact in artifacts:
            result = await download_artifact_json(org, repo, artifact["id"], token, "scan-result.json")
            if result is not None:
                ingest_scan_result(db, scan, result)
                found_result = True

        apply_artifact_metadata(db, scan, find_report_artifact(artifacts), run_completed=True)
        finalize_scan(db, scan, status="completed" if (found_result or conclusion == "success") else "failed")
        print(f"[github webhook] ingested results for scan {scan_id} ({'ok' if found_result else 'no result artifact found'})")
    except HTTPException as exc:
        print(f"[github webhook] failed to retrieve results for scan {scan_id}: {exc.detail}")
        db.add(scan)
        db.commit()
        finalize_scan(db, scan, status="failed")


@router.post("/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def webhook(
    request: Request,
    x_hub_signature_256: str | None = Header(default=None),
    x_github_event: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    payload = await request.body()
    _verify_signature(payload, x_hub_signature_256)

    event = await request.json()

    if x_github_event == "installation":
        action = event.get("action")
        account = event.get("installation", {}).get("account", {}).get("login")
        print(f"[github webhook] installation {action} for {account}")
    elif x_github_event == "pull_request":
        await _handle_pull_request(event, db)
    elif x_github_event == "workflow_run":
        await _handle_workflow_run(event, db)
    else:
        print(f"[github webhook] received event: {x_github_event}")
