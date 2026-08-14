from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

Severity = Literal["critical", "high", "medium", "low", "info"]
VulnStatus = Literal["open", "in_progress", "resolved", "ignored", "false_positive"]
ScanStatus = Literal["running", "completed", "failed"]


class ScannerResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    scanner: str
    status: str
    duration_seconds: int | None
    findings_count: int
    error_message: str | None
    category: str | None = None
    summary: str | None = None


class VulnerabilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    severity: Severity
    scanner: str
    vulnerability_type: str
    file_path: str
    line_number: int | None
    dependency: str | None
    installed_version: str | None
    fixed_version: str | None
    cve: str | None
    cwe: str | None
    cvss_score: float | None
    recommendation: str
    repository: str
    branch: str
    commit_sha: str
    status: VulnStatus
    detected_at: datetime


class ScanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    scan_number: int | None
    repository: str
    branch: str
    commit_sha: str
    author: str | None
    trigger: str
    started_at: datetime
    completed_at: datetime | None
    duration_seconds: int | None
    status: ScanStatus
    total_vulnerabilities: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    scanner_results: list[ScannerResultOut] = []
    pr_number: int | None = None

    workflow_run_id: str | None = None
    run_attempt: int | None = None
    workflow_name: str | None = None

    artifact_status: str | None = None
    artifact_file_name: str | None = None
    artifact_size_bytes: int | None = None
    artifact_created_at: datetime | None = None
    artifact_expires_at: datetime | None = None
    artifact_last_checked_at: datetime | None = None

    dast_workflow_run_id: str | None = None
    dast_run_attempt: int | None = None
    dast_workflow_name: str | None = None
    dast_status: str | None = None

    dast_artifact_status: str | None = None
    dast_artifact_file_name: str | None = None
    dast_artifact_size_bytes: int | None = None
    dast_artifact_created_at: datetime | None = None
    dast_artifact_expires_at: datetime | None = None
    dast_artifact_last_checked_at: datetime | None = None

    dast_only: bool = False

    
    @field_validator("dast_only", mode="before")
    @classmethod
    def _default_dast_only(cls, value: bool | None) -> bool:
        return bool(value)


class RepositoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    full_name: str
    org: str
    default_branch: str
    last_commit_sha: str | None
    last_scanned_at: datetime | None
    total_vulnerabilities: int
    critical_count: int
    high_count: int
    security_grade: Literal["A", "B", "C", "D", "F"]
    is_active: bool


class ScannerOut(BaseModel):
    id: str
    name: str
    category: str
    description: str
    is_enabled: bool
    last_scan_at: datetime | None
    total_findings: int
    version: str


class DashboardSummaryOut(BaseModel):
    total_vulnerabilities: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    latest_scan: ScanOut | None
    open_count: int
    resolved_count: int
    mttr_days: float
    scans_this_week: int


class TrendDataPointOut(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int
    total: int


class ScannerStatOut(BaseModel):
    scanner: str
    count: int
    critical: int
    high: int


class ScansSummaryOut(BaseModel):
    total: int
    completed: int
    failed: int
    running: int
    avg_duration_seconds: int
    total_findings: int


class ScanListOut(BaseModel):
    items: list[ScanOut]
    total: int


class VulnStatusUpdateIn(BaseModel):
    status: VulnStatus


class VulnBulkUpdateIn(BaseModel):
    ids: list[str]
    status: VulnStatus


class VulnerabilityListOut(BaseModel):
    items: list[VulnerabilityOut]
    total: int


class VulnFilterOptionsOut(BaseModel):
    scanners: list[str]
    repositories: list[str]
    types: list[str]
