from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.access import get_user_accessible_logins, repo_scope_clause
from app.database import get_db
from models.scan import Scan
from models.user import User
from models.vulnerability import Vulnerability
from routes.auth import get_current_user
from shemas.schemas import DashboardSummaryOut, ScanOut, ScannerStatOut, TrendDataPointOut, VulnerabilityOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


_SEVERITIES = ["critical", "high", "medium", "low", "info"]


@router.get("/summary", response_model=DashboardSummaryOut)
async def get_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logins = await get_user_accessible_logins(current_user, db)
    vuln_scope = repo_scope_clause(Vulnerability.repository, logins)
    scan_scope = repo_scope_clause(Scan.repository, logins)

    severity_counts = {sev: 0 for sev in _SEVERITIES}
    for severity, count in (
        db.query(Vulnerability.severity, func.count(Vulnerability.id))
        .filter(Vulnerability.status == "open", vuln_scope)
        .group_by(Vulnerability.severity)
        .all()
    ):
        if severity in severity_counts:
            severity_counts[severity] = count
    total_open = sum(severity_counts.values())

    resolved_count = (
        db.query(func.count(Vulnerability.id))
        .filter(Vulnerability.status == "resolved", vuln_scope)
        .scalar()
        or 0
    )

    resolved_durations = (
        db.query(Vulnerability.detected_at, Vulnerability.resolved_at)
        .filter(Vulnerability.status == "resolved", Vulnerability.resolved_at.isnot(None), vuln_scope)
        .all()
    )
    mttr_days = (
        sum((r.resolved_at - r.detected_at).total_seconds() for r in resolved_durations)
        / len(resolved_durations)
        / 86400
        if resolved_durations
        else 0.0
    )

    latest_scan = db.query(Scan).filter(scan_scope).order_by(Scan.started_at.desc()).first()

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    scans_this_week = (
        db.query(func.count(Scan.id)).filter(Scan.started_at >= week_ago, scan_scope).scalar() or 0
    )

    # Last-7-days movement, so the KPI cards can show direction and not just a level.
    new_this_week = {sev: 0 for sev in _SEVERITIES}
    for severity, count in (
        db.query(Vulnerability.severity, func.count(Vulnerability.id))
        .filter(Vulnerability.detected_at >= week_ago, vuln_scope)
        .group_by(Vulnerability.severity)
        .all()
    ):
        if severity in new_this_week:
            new_this_week[severity] = count
    resolved_this_week = (
        db.query(func.count(Vulnerability.id))
        .filter(
            Vulnerability.status == "resolved",
            Vulnerability.resolved_at >= week_ago,
            vuln_scope,
        )
        .scalar()
        or 0
    )

    return DashboardSummaryOut(
        total_vulnerabilities=total_open,
        critical_count=severity_counts["critical"],
        high_count=severity_counts["high"],
        medium_count=severity_counts["medium"],
        low_count=severity_counts["low"],
        info_count=severity_counts["info"],
        latest_scan=ScanOut.model_validate(latest_scan) if latest_scan else None,
        open_count=total_open,
        resolved_count=resolved_count,
        mttr_days=round(mttr_days, 1),
        scans_this_week=scans_this_week,
        new_this_week=sum(new_this_week.values()),
        critical_new_this_week=new_this_week["critical"],
        high_new_this_week=new_this_week["high"],
        resolved_this_week=resolved_this_week,
    )


@router.get("/trend", response_model=list[TrendDataPointOut])
async def get_trend(
    days: int = Query(7, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vulnerability counts per day for the last `days` days, zero-filled. The day-range
    control only ever changes this window -- it has no repository dimension.
    """
    logins = await get_user_accessible_logins(current_user, db)
    today = datetime.now(timezone.utc).date()
    since = today - timedelta(days=days - 1)

    buckets = {
        (since + timedelta(days=i)).isoformat(): {"critical": 0, "high": 0, "medium": 0, "low": 0, "total": 0}
        for i in range(days)
    }

    rows = (
        db.query(func.date(Vulnerability.detected_at), Vulnerability.severity, func.count(Vulnerability.id))
        .filter(Vulnerability.detected_at >= since, repo_scope_clause(Vulnerability.repository, logins))
        .group_by(func.date(Vulnerability.detected_at), Vulnerability.severity)
        .all()
    )
    for day, severity, count in rows:
        day_str = day.isoformat() if hasattr(day, "isoformat") else str(day)
        bucket = buckets.get(day_str)
        if bucket is None:
            continue
        if severity in ("critical", "high", "medium", "low"):
            bucket[severity] += count
        bucket["total"] += count

    return [TrendDataPointOut(date=day, **counts) for day, counts in buckets.items()]


@router.get("/scanner-stats", response_model=list[ScannerStatOut])
async def get_scanner_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logins = await get_user_accessible_logins(current_user, db)
    rows = (
        db.query(
            Vulnerability.scanner,
            func.count(Vulnerability.id),
            func.sum(case((Vulnerability.severity == "critical", 1), else_=0)),
            func.sum(case((Vulnerability.severity == "high", 1), else_=0)),
        )
        .filter(Vulnerability.status == "open", repo_scope_clause(Vulnerability.repository, logins))
        .group_by(Vulnerability.scanner)
        .all()
    )
    return [
        ScannerStatOut(scanner=scanner, count=count, critical=int(critical or 0), high=int(high or 0))
        for scanner, count, critical, high in rows
    ]


@router.get("/recent-vulnerabilities", response_model=list[VulnerabilityOut])
async def get_recent_vulnerabilities(
    limit: int = Query(8, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logins = await get_user_accessible_logins(current_user, db)
    return (
        db.query(Vulnerability)
        .filter(repo_scope_clause(Vulnerability.repository, logins))
        .order_by(Vulnerability.detected_at.desc())
        .limit(limit)
        .all()
    )
