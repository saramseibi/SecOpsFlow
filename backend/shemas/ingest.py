from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ScanTrigger = Literal["push", "manual", "schedule", "pr"]
ScannerStatus = Literal["completed", "failed", "skipped", "running", "cancelled"]


class RawScannerReport(BaseModel):
    """One tool's output as attached by the GitHub Actions workflow.

    `raw` is the scanner's native JSON, untouched -- normalization happens
    server-side so adding a new tool never requires changing the workflow's
    upload shape, only adding a normalizer in app/normalizers.py.
    """

    scanner: str  
    status: ScannerStatus = "completed"
    duration_seconds: int | None = None
    error_message: str | None = None
    category: str | None = None 
    summary: str | None = None 
    raw: Any = None  


class ScanIngestPayload(BaseModel):
    """Body of POST /api/ingest/scan, sent once per workflow run."""

    repository: str = Field(..., description='"org/repo" (GITHUB_REPOSITORY)')
    branch: str
    commit_sha: str
    author: str | None = None
    trigger: ScanTrigger = "push"
    pr_number: int | None = None

    started_at: datetime
    completed_at: datetime | None = None

    reports: list[RawScannerReport] = Field(default_factory=list)
