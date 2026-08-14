from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.access import get_user_accessible_logins, repo_scope_clause
from app.database import get_db
from models.user import User
from models.vulnerability import Vulnerability
from routes.auth import get_current_user
from shemas.schemas import (
    VulnBulkUpdateIn,
    VulnerabilityListOut,
    VulnerabilityOut,
    VulnFilterOptionsOut,
    VulnStatusUpdateIn,
)

router = APIRouter(prefix="/api/vulnerabilities", tags=["vulnerabilities"])




def _apply_filters(
    query,
    *,
    logins: set[str],
    severity: str | None,
    scanner: str | None,
    status_filter: str | None,
    repository: str | None,
    vulnerability_type: str | None,
    search: str | None,
    scan_id: str | None = None,
):
    query = query.filter(repo_scope_clause(Vulnerability.repository, logins))
    if scan_id:
        query = query.filter(Vulnerability.scan_id == scan_id)
    if severity:
        query = query.filter(Vulnerability.severity == severity)
    if scanner:
        query = query.filter(Vulnerability.scanner == scanner)
    if status_filter:
        query = query.filter(Vulnerability.status == status_filter)
    if repository:
        query = query.filter(Vulnerability.repository == repository)
    if vulnerability_type:
        query = query.filter(Vulnerability.vulnerability_type == vulnerability_type)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Vulnerability.title.ilike(like),
                Vulnerability.cve.ilike(like),
                Vulnerability.cwe.ilike(like),
                Vulnerability.file_path.ilike(like),
                Vulnerability.dependency.ilike(like),
            )
        )
    return query


@router.get("", response_model=VulnerabilityListOut)
async def list_vulnerabilities(
    search: str | None = Query(None),
    severity: str | None = Query(None),
    scanner: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    repository: str | None = Query(None),
    vulnerability_type: str | None = Query(None, alias="type"),
    scan_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logins = await get_user_accessible_logins(current_user, db)
    query = _apply_filters(
        db.query(Vulnerability),
        logins=logins,
        severity=severity,
        scanner=scanner,
        status_filter=status_filter,
        repository=repository,
        vulnerability_type=vulnerability_type,
        search=search,
        scan_id=scan_id,
    )
    total = query.count()
    items = (
        query.order_by(Vulnerability.detected_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return VulnerabilityListOut(items=[VulnerabilityOut.model_validate(v) for v in items], total=total)


@router.get("/filters", response_model=VulnFilterOptionsOut)
async def get_filter_options(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Distinct scanner/repository/type values within the user's own scope, used to
    populate the filter dropdowns instead of hardcoding a fixed set of options.
    """
    logins = await get_user_accessible_logins(current_user, db)
    scope = repo_scope_clause(Vulnerability.repository, logins)
    scanners = [r[0] for r in db.query(Vulnerability.scanner).filter(scope).distinct().all() if r[0]]
    repositories = [r[0] for r in db.query(Vulnerability.repository).filter(scope).distinct().all() if r[0]]
    types = [r[0] for r in db.query(Vulnerability.vulnerability_type).filter(scope).distinct().all() if r[0]]
    return VulnFilterOptionsOut(scanners=sorted(scanners), repositories=sorted(repositories), types=sorted(types))


async def _get_owned_vulnerability(vuln_id: str, current_user: User, db: Session) -> Vulnerability:
    vuln = db.query(Vulnerability).filter(Vulnerability.id == vuln_id).first()
    if vuln is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vulnerability not found.")
    logins = await get_user_accessible_logins(current_user, db)
    owner = vuln.repository.split("/", 1)[0]
    if owner not in logins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this finding.")
    return vuln


def _apply_status(vuln: Vulnerability, new_status: str) -> None:
    vuln.status = new_status
    vuln.resolved_at = datetime.now(timezone.utc) if new_status == "resolved" else None


@router.get("/{vuln_id}", response_model=VulnerabilityOut)
async def get_vulnerability(
    vuln_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vuln = await _get_owned_vulnerability(vuln_id, current_user, db)
    return VulnerabilityOut.model_validate(vuln)


@router.patch("/bulk/update", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_update_vulnerabilities(
    body: VulnBulkUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logins = await get_user_accessible_logins(current_user, db)
    vulns = db.query(Vulnerability).filter(Vulnerability.id.in_(body.ids)).all()
    for vuln in vulns:
        owner = vuln.repository.split("/", 1)[0]
        if owner not in logins:
            continue  # silently skip anything outside the user's own scope
        _apply_status(vuln, body.status)
        db.add(vuln)
    db.commit()


@router.patch("/{vuln_id}", response_model=VulnerabilityOut)
async def update_vulnerability_status(
    vuln_id: str,
    body: VulnStatusUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vuln = await _get_owned_vulnerability(vuln_id, current_user, db)
    _apply_status(vuln, body.status)
    db.add(vuln)
    db.commit()
    db.refresh(vuln)
    return VulnerabilityOut.model_validate(vuln)
