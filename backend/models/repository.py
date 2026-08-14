import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Repository(Base):
    """A scanned GitHub repository, upserted the first time a scan for it arrives."""

    __tablename__ = "repositories"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(255), nullable=False)
    full_name = Column(String(255), unique=True, nullable=False, index=True)  # "org/repo"
    org = Column(String(255), nullable=False)
    default_branch = Column(String(255), default="main")
    last_commit_sha = Column(String(64), nullable=True)
    last_scanned_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    scans = relationship("Scan", back_populates="repository_ref", cascade="all, delete-orphan")
