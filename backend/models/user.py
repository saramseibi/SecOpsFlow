import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, String

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # GitHub OAuth connection (optional, linked after signup/signin).
    github_id = Column(String(64), nullable=True)
    github_username = Column(String(255), nullable=True)
    github_avatar_url = Column(String(512), nullable=True)
    github_access_token = Column(String(255), nullable=True)
    github_connected_at = Column(DateTime, nullable=True)
    # GitHub App user tokens expire (default 8h) and are renewed via refresh_token, which
    # itself expires (default ~6mo) -- both expiries are tracked so a stale access_token
    # can be silently refreshed instead of failing every request once it lapses.
    github_refresh_token = Column(String(255), nullable=True)
    github_token_expires_at = Column(DateTime, nullable=True)
    github_refresh_token_expires_at = Column(DateTime, nullable=True)
