import asyncio
import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import GITHUB_DAST_WORKFLOW_NAME_HINTS, GITHUB_WEBHOOK_SECRET
from app.database import SessionLocal, get_db
from app.github_app import (
    download_artifact_json,
    download_zap_report_json,
    find_report_artifact,
    get_installation_id_for_account,
    get_installation_token,
    list_run_artifacts,
    list_runs_for_commit,
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

# Scans whose run results are being ingested right now. A completed run can reach us twice
# -- via the webhook and via the reconciler below, or a redelivered webhook -- and both
# would otherwise ingest the same findings onto the scan.
_in_flight: set[str] = set()


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


async def _handle_dast_workflow_run(event: dict, db: Session, scan: Scan | None = None) -> None:
    """DAST counterpart of `_handle_workflow_run`. The DAST workflow is never dispatched
    by this app (see GITHUB_DAST_WORKFLOW_NAME_HINT), so there's no scan_id embedded in its
    run-name to look the Scan up by -- instead it's matched onto the most recent Scan for
    the same repository + commit sha. If no such Scan exists yet, the run is dropped; DAST
    is only ever attached onto a scan the security-scan workflow already created.

    The reconciler passes `scan` explicitly, since it already knows which scan the run
    belongs to.
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

    scan = scan or _find_scan_for_run(db, event)
    if scan is None:
        print(f"[github webhook] no scan found for {full_name}@{head_sha}, ignoring DAST run {run_id}")
        return

    in_flight_key = f"dast:{scan.id}"
    already_done = scan.dast_workflow_run_id == str(run_id) and scan.dast_status in ("completed", "failed")
    if in_flight_key in _in_flight or already_done:
        print(f"[github webhook] DAST run {run_id} for scan {scan.id} already handled, ignoring")
        return
    _in_flight.add(in_flight_key)

    try:
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
            finalize_scan(
                db,
                scan,
                status="completed" if scan.dast_status == "completed" else "failed",
                completed_at=run.get("updated_at"),
            )
    finally:
        _in_flight.discard(in_flight_key)


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
    scan_id = _scan_id_from_run(run)

    if not (org and repo and run_id and scan_id):
        print(f"[github webhook] workflow_run completed but couldn't extract scan_id from '{display_title}'")
        return

    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if scan is None:
        print(f"[github webhook] no pending scan found for scan_id={scan_id}, ignoring")
        return
    if scan.status != "running" or scan.id in _in_flight:
        print(f"[github webhook] scan {scan_id} already handled, ignoring run {run_id}")
        return
    _in_flight.add(scan.id)

    try:
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
            finalize_scan(
                db,
                scan,
                status="completed" if (found_result or conclusion == "success") else "failed",
                completed_at=run.get("updated_at"),
            )
            print(f"[github webhook] ingested results for scan {scan_id} ({'ok' if found_result else 'no result artifact found'})")
        except HTTPException as exc:
            print(f"[github webhook] failed to retrieve results for scan {scan_id}: {exc.detail}")
            db.add(scan)
            db.commit()
            finalize_scan(db, scan, status="failed", completed_at=run.get("updated_at"))
    finally:
        _in_flight.discard(scan.id)


def _scan_id_from_run(run: dict) -> str | None:
    """The scan_id this app embedded in a dispatched run's run-name ("<name> - <scan_id>")."""
    display_title = run.get("display_title") or run.get("name") or ""
    return display_title.rsplit(" - ", 1)[-1].strip() if " - " in display_title else None


# --- Reconciler -------------------------------------------------------------------------
# The webhook is the fast path, but it's fire-and-forget: if the backend (or the smee.io
# forwarder in local dev) isn't connected at the moment GitHub sends `workflow_run
# completed`, that event is gone for good and the scan would sit at "running" forever.
# So every running scan is also periodically checked against GitHub's own view of its run
# and finalized through the exact same handlers the webhook uses.

RECONCILE_INTERVAL_SECONDS = 30

# A dispatched run shows up in GitHub's run list within seconds. If it still hasn't after
# this long, the dispatch never produced a run and nothing will ever finish the scan.
_MISSING_RUN_GRACE = timedelta(minutes=30)


def _parse_run_created_at(run: dict) -> datetime | None:
    try:
        return datetime.strptime(run.get("created_at") or "", "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return None


def _naive_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=None)


def _match_primary_run(scan: Scan, runs: list[dict]) -> dict | None:
    exact = next((r for r in runs if _scan_id_from_run(r) == scan.id), None)
    if exact is not None or not scan.dast_only:
        return exact

    # A dispatched DAST workflow may not declare a scan_id input to put in its run-name,
    # so fall back to the first DAST run created for this commit since the scan started.
    since = _naive_utc(scan.started_at) - timedelta(minutes=1)
    candidates = [
        r for r in runs
        if _is_dast_run(r) and (created := _parse_run_created_at(r)) is not None and created >= since
    ]
    return min(candidates, key=_parse_run_created_at, default=None)


async def _reconcile_scan(db: Session, scan_id: str, tokens: dict[str, str]) -> None:
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if scan is None or scan.id in _in_flight:
        return

    org, _, repo = scan.repository.partition("/")
    if org not in tokens:
        tokens[org] = await get_installation_token(await get_installation_id_for_account(org))
    runs = await list_runs_for_commit(org, repo, scan.commit_sha, tokens[org])
    repository = {"full_name": scan.repository, "name": repo, "owner": {"login": org}}

    if scan.status == "running":
        run = _match_primary_run(scan, runs)
        if run is None:
            if _naive_utc(datetime.now(timezone.utc)) - _naive_utc(scan.started_at) > _MISSING_RUN_GRACE:
                print(f"[reconciler] no workflow run ever appeared for scan {scan.id}, marking it failed")
                finalize_scan(db, scan, status="failed")
            return
        if run.get("status") == "completed":
            print(f"[reconciler] run {run['id']} for scan {scan.id} completed without a webhook, finalizing")
            event = {"action": "completed", "workflow_run": run, "repository": repository}
            if _is_dast_run(run):
                await _handle_dast_workflow_run(event, db, scan=scan)
            else:
                await _handle_workflow_run(event, db)

    # A DAST run attached to a regular scan whose own completion webhook was lost.
    if scan.dast_status == "running" and scan.dast_workflow_run_id:
        run = next((r for r in runs if str(r.get("id")) == scan.dast_workflow_run_id), None)
        if run is not None and run.get("status") == "completed":
            print(f"[reconciler] DAST run {run['id']} for scan {scan.id} completed without a webhook, finalizing")
            event = {"action": "completed", "workflow_run": run, "repository": repository}
            await _handle_dast_workflow_run(event, db, scan=scan)


async def reconcile_running_scans() -> None:
    with SessionLocal() as db:
        scan_ids = [
            row.id
            for row in db.query(Scan.id).filter(or_(Scan.status == "running", Scan.dast_status == "running"))
        ]

    tokens: dict[str, str] = {}
    for scan_id in scan_ids:
        # Fresh session per scan, so a scan the webhook finalized a moment ago is seen as such.
        with SessionLocal() as db:
            try:
                await _reconcile_scan(db, scan_id, tokens)
            except Exception as exc:
                detail = exc.detail if isinstance(exc, HTTPException) else repr(exc)
                print(f"[reconciler] couldn't check scan {scan_id} against GitHub: {detail}")


async def run_scan_reconciler() -> None:
    """Runs for the lifetime of the app. The first pass happens right at startup, which is
    exactly when webhooks sent while the app was down would otherwise have been lost.
    """
    while True:
        try:
            await reconcile_running_scans()
        except Exception as exc:
            print(f"[reconciler] pass failed: {exc!r}")
        await asyncio.sleep(RECONCILE_INTERVAL_SECONDS)


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
