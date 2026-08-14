import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Scan(Base):
    """One CI run of the security-scan workflow (one commit/PR)."""

    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=_uuid)
    scan_number = Column(Integer, autoincrement=True, unique=True)
    repository_id = Column(String(36), ForeignKey("repositories.id"), nullable=False)

    repository = Column(String(255), nullable=False)
    branch = Column(String(255), nullable=False)
    commit_sha = Column(String(64), nullable=False)
    author = Column(String(255), nullable=True)
    trigger = Column(String(50), default="push")
    pr_number = Column(Integer, nullable=True)

    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(String(50), default="running")

    total_vulnerabilities = Column(Integer, default=0)
    critical_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)
    info_count = Column(Integer, default=0)

  
    workflow_run_id = Column(String(64), nullable=True)
    run_attempt = Column(Integer, nullable=True)
    workflow_name = Column(String(255), nullable=True)


    artifact_status = Column(String(50), default="waiting")  
    artifact_file_name = Column(String(255), nullable=True)
    artifact_size_bytes = Column(Integer, nullable=True)
    artifact_created_at = Column(DateTime, nullable=True)
    artifact_expires_at = Column(DateTime, nullable=True)
    artifact_last_checked_at = Column(DateTime, nullable=True)

   
    dast_workflow_run_id = Column(String(64), nullable=True)
    dast_run_attempt = Column(Integer, nullable=True)
    dast_workflow_name = Column(String(255), nullable=True)
    dast_status = Column(String(50), default="waiting")  
    dast_artifact_status = Column(String(50), default="waiting")
    dast_artifact_file_name = Column(String(255), nullable=True)
    dast_artifact_size_bytes = Column(Integer, nullable=True)
    dast_artifact_created_at = Column(DateTime, nullable=True)
    dast_artifact_expires_at = Column(DateTime, nullable=True)
    dast_artifact_last_checked_at = Column(DateTime, nullable=True)

   
    dast_only = Column(Boolean, default=False)

    repository_ref = relationship("Repository", back_populates="scans")
    scanner_results = relationship(
        "ScannerResult", back_populates="scan", cascade="all, delete-orphan"
    )
    vulnerabilities = relationship(
        "Vulnerability", back_populates="scan", cascade="all, delete-orphan"
    )


class ScannerResult(Base):
    """Per-tool outcome within a scan (e.g. trivy completed with 12 findings)."""

    __tablename__ = "scanner_results"

    id = Column(String(36), primary_key=True, default=_uuid)
    scan_id = Column(String(36), ForeignKey("scans.id"), nullable=False)

    scanner = Column(String(100), nullable=False)
    status = Column(String(50), default="completed")
    duration_seconds = Column(Integer, nullable=True)
    findings_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

   
    category = Column(String(100), nullable=True)
    summary = Column(String(255), nullable=True)

    scan = relationship("Scan", back_populates="scanner_results")
