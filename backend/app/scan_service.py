"""Owns the DB side of a scan's lifecycle: created as "running" when a workflow is
dispatched, then filled in once its result artifact is retrieved from GitHub.
"""

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.job_config import category_for, summarize
from app.normalizers import normalize_scan_result, normalize_zap
from models.repository import Repository
from models.scan import Scan, ScannerResult
from models.vulnerability import Vulnerability

_SEVERITY_FIELDS = {
    "critical": "critical_count",
    "high": "high_count",
    "medium": "medium_count",
    "low": "low_count",
    "info": "info_count",
}


def get_or_create_repository(db: Session, full_name: str, default_branch: str = "main") -> Repository:
    repo = db.query(Repository).filter(Repository.full_name == full_name).first()
    if repo is not None:
        return repo

    org, _, name = full_name.partition("/")
    repo = Repository(name=name, full_name=full_name, org=org, default_branch=default_branch)
    db.add(repo)
    db.commit()
    db.refresh(repo)
    return repo


def create_pending_scan(
    db: Session,
    *,
    scan_id: str,
    repository: Repository,
    branch: str,
    commit_sha: str,
    trigger: str,
    author: str | None = None,
    pr_number: int | None = None,
    dast_only: bool = False,
) -> Scan:
    next_number = (db.query(func.max(Scan.scan_number)).scalar() or 0) + 1
    scan = Scan(
        id=scan_id,
        scan_number=next_number,
        repository_id=repository.id,
        repository=repository.full_name,
        branch=branch,
        commit_sha=commit_sha,
        author=author,
        trigger=trigger,
        pr_number=pr_number,
        started_at=datetime.now(timezone.utc),
        status="running",
        dast_only=dast_only,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


def ingest_scan_result(db: Session, scan: Scan, scan_result: dict) -> None:
    """Apply one scanner's scan-result.json to `scan`: store its per-tool outcome, normalize
    and store its findings, and roll the severity counts up onto the scan.
    """
    tool_status = scan_result.get("status", "completed")
    scanner_name = scan_result.get("scanner", "unknown")
    scanner_result = ScannerResult(
        scan_id=scan.id,
        scanner=scanner_name,
        status=tool_status,
        duration_seconds=scan_result.get("duration_seconds"),
        error_message=scan_result.get("error"),
        category=scan_result.get("category") or category_for(scanner_name),
    )

    findings = []
    if tool_status == "completed":
        findings = normalize_scan_result(
            scan_result,
            repository=scan.repository,
            branch=scan.branch,
            commit_sha=scan.commit_sha,
        )
    scanner_result.findings_count = len(findings)
    raw_summary = scan_result.get("summary")
    scanner_result.summary = raw_summary if isinstance(raw_summary, str) and raw_summary else summarize(
        scanner_name, tool_status, scan_result, len(findings)
    )
    db.add(scanner_result)

    now = datetime.now(timezone.utc)
    for finding in findings:
        db.add(Vulnerability(scan_id=scan.id, detected_at=now, status="open", **finding))
        field = _SEVERITY_FIELDS.get(finding["severity"])
        if field:
            setattr(scan, field, getattr(scan, field) + 1)
        scan.total_vulnerabilities += 1

    db.add(scan)
    db.commit()


def ingest_zap_result(db: Session, scan: Scan, zap_report: dict) -> None:
    """DAST counterpart of `ingest_scan_result`, for a ZAP report downloaded straight from
    the zaproxy GitHub Action's artifact rather than this app's scan-result.json convention.
    """
    findings = normalize_zap(
        zap_report,
        repository=scan.repository,
        branch=scan.branch,
        commit_sha=scan.commit_sha,
    )
    # scanner="dast" (not "zap") so this lands in the Scan Overview's fixed "DAST Scan" job
    # row, which is keyed by that name -- the underlying tool is still recorded as "zap" on
    # each Vulnerability row (via normalize_zap) for display/filtering there.
    scanner_result = ScannerResult(
        scan_id=scan.id,
        scanner="dast",
        status="completed",
        category=category_for("dast"),
        findings_count=len(findings),
        summary=(
            f"{len(findings)} finding{'s' if len(findings) != 1 else ''}" if findings else "No issues found"
        ),
    )
    db.add(scanner_result)

    now = datetime.now(timezone.utc)
    for finding in findings:
        db.add(Vulnerability(scan_id=scan.id, detected_at=now, status="open", **finding))
        field = _SEVERITY_FIELDS.get(finding["severity"])
        if field:
            setattr(scan, field, getattr(scan, field) + 1)
        scan.total_vulnerabilities += 1

    db.add(scan)
    db.commit()


def _parse_github_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return None


def apply_workflow_run_metadata(scan: Scan, *, workflow_run_id: int, run_attempt: int | None, workflow_name: str | None) -> None:
    scan.workflow_run_id = str(workflow_run_id)
    scan.run_attempt = run_attempt
    scan.workflow_name = workflow_name


def apply_artifact_metadata(db: Session, scan: Scan, artifact: dict | None, *, run_completed: bool) -> None:
    """Reflect a GitHub artifacts-list lookup for the `ci-security-report` artifact onto
    the scan row. Called both right after a workflow_run webhook fires and from the
    "refresh artifact status" action on the Scan Overview page.
    """
    scan.artifact_last_checked_at = datetime.now(timezone.utc)
    if artifact is not None:
        scan.artifact_status = "expired" if artifact.get("expired") else "available"
        scan.artifact_file_name = f"{artifact.get('name')}.json"
        scan.artifact_size_bytes = artifact.get("size_in_bytes")
        scan.artifact_created_at = _parse_github_timestamp(artifact.get("created_at"))
        scan.artifact_expires_at = _parse_github_timestamp(artifact.get("expires_at"))
    else:
        scan.artifact_status = "missing" if run_completed else "pending"
    db.add(scan)
    db.commit()


def apply_dast_workflow_run_metadata(
    scan: Scan, *, workflow_run_id: int, run_attempt: int | None, workflow_name: str | None
) -> None:
    scan.dast_workflow_run_id = str(workflow_run_id)
    scan.dast_run_attempt = run_attempt
    scan.dast_workflow_name = workflow_name


def apply_dast_artifact_metadata(db: Session, scan: Scan, artifact: dict | None, *, run_completed: bool) -> None:
    """DAST counterpart of `apply_artifact_metadata` -- same `CI_REPORT_ARTIFACT_NAME`
    lookup, applied to the DAST run's own tracked columns instead of the security-scan
    workflow's.
    """
    scan.dast_artifact_last_checked_at = datetime.now(timezone.utc)
    if artifact is not None:
        scan.dast_artifact_status = "expired" if artifact.get("expired") else "available"
        scan.dast_artifact_file_name = f"{artifact.get('name')}.json"
        scan.dast_artifact_size_bytes = artifact.get("size_in_bytes")
        scan.dast_artifact_created_at = _parse_github_timestamp(artifact.get("created_at"))
        scan.dast_artifact_expires_at = _parse_github_timestamp(artifact.get("expires_at"))
    else:
        scan.dast_artifact_status = "missing" if run_completed else "pending"
    db.add(scan)
    db.commit()


def finalize_scan(db: Session, scan: Scan, *, status: str, completed_at: str | None = None) -> None:
    """`completed_at` is the run's own GitHub timestamp when known, so a scan finalized late
    (by the reconciler, after a lost webhook) still gets its real duration.
    """
    scan.status = status
    run_finished = _parse_github_timestamp(completed_at)
    scan.completed_at = run_finished.replace(tzinfo=timezone.utc) if run_finished else datetime.now(timezone.utc)
    if scan.started_at:
        started = scan.started_at if scan.started_at.tzinfo else scan.started_at.replace(tzinfo=timezone.utc)
        scan.duration_seconds = int((scan.completed_at - started).total_seconds())

    repo = db.query(Repository).filter(Repository.id == scan.repository_id).first()
    if repo is not None:
        repo.last_commit_sha = scan.commit_sha
        repo.last_scanned_at = scan.completed_at
        db.add(repo)

    db.add(scan)
    db.commit()
