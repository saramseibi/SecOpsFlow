"""Shared GitHub-access helpers: verifying a user's own OAuth token is connected, and
resolving which account logins (their personal login + orgs they belong to) they may
scope requests to. Used to validate that an `account` or `repository_id` filter a
request supplies actually belongs to the authenticated user, rather than trusting it.
"""

import time
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status
from sqlalchemy import false, or_
from sqlalchemy.orm import Session

from app.config import GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
from models.user import User

GITHUB_API_URL = "https://api.github.com"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"


_EXPIRY_SAFETY_MARGIN_SECONDS = 60

_RECONNECT_DETAIL = "Your GitHub connection has expired. Please reconnect your account."


def _apply_token_response(user: User, data: dict) -> None:
    now = time.time()
    user.github_access_token = data["access_token"]
    if "expires_in" in data:
        user.github_token_expires_at = datetime.fromtimestamp(now + int(data["expires_in"]), tz=timezone.utc)
    if "refresh_token" in data:
        user.github_refresh_token = data["refresh_token"]
    if "refresh_token_expires_in" in data:
        user.github_refresh_token_expires_at = datetime.fromtimestamp(
            now + int(data["refresh_token_expires_in"]), tz=timezone.utc
        )


def clear_github_connection(user: User, db: Session) -> None:
    user.github_id = None
    user.github_username = None
    user.github_avatar_url = None
    user.github_access_token = None
    user.github_connected_at = None
    user.github_refresh_token = None
    user.github_token_expires_at = None
    user.github_refresh_token_expires_at = None
    db.add(user)
    db.commit()


async def _refresh_access_token(user: User, db: Session) -> str:
    """Exchange the stored refresh_token for a new access_token (GitHub App user tokens
    expire, by default every 8h, unlike classic OAuth App tokens). If the refresh_token is
    missing/expired/rejected, the connection can't be silently repaired, so it's cleared
    and the caller is told to reconnect rather than left pointing at a dead token forever.
    """
    if not user.github_refresh_token:
        clear_github_connection(user, db)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_RECONNECT_DETAIL)

    async with httpx.AsyncClient() as client:
        res = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": user.github_refresh_token,
            },
        )
    data = res.json() if res.status_code == 200 else {}
    if not data.get("access_token"):
        clear_github_connection(user, db)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_RECONNECT_DETAIL)

    _apply_token_response(user, data)
    db.add(user)
    db.commit()
    return user.github_access_token


def reject_dead_token(res: httpx.Response, user: User, db: Session) -> None:
    """Call after any GitHub API request made with a user's stored token. Catches the case
    a proactive refresh can't: a token GitHub has already revoked/rejected that we didn't
    know was bad (e.g. one saved before refresh_token tracking existed, so it has no
    recorded expiry and get_valid_github_token had no reason to refresh it). Without this,
    such a request would surface as a generic 502 and the frontend would just show an
    empty list instead of prompting reconnect.
    """
    if res.status_code == 401:
        clear_github_connection(user, db)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_RECONNECT_DETAIL)


async def get_valid_github_token(user: User, db: Session) -> str:
    """The single place that decides "does this user have a usable GitHub token right
    now" -- refreshing an expired/near-expired access_token via the stored refresh_token
    first, so callers never have to think about GitHub App token expiry themselves.
    Tokens with no recorded expiry (classic OAuth) are returned as-is.
    """
    if not user.github_access_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GitHub is not connected.")

    expires_at = user.github_token_expires_at
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at.timestamp() - _EXPIRY_SAFETY_MARGIN_SECONDS <= time.time():
            return await _refresh_access_token(user, db)

    return user.github_access_token


async def get_accessible_logins(token: str, own_login: str | None) -> set[str]:
    logins = {own_login} if own_login else set()
    async with httpx.AsyncClient() as client:
        org_res = await client.get(
            f"{GITHUB_API_URL}/user/orgs",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            params={"per_page": 100},
        )

        collab_res = await client.get(
            f"{GITHUB_API_URL}/user/repos",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            params={"per_page": 100, "affiliation": "collaborator,organization_member"},
        )
    if org_res.status_code == 200:
        logins.update(org["login"] for org in org_res.json())
    if collab_res.status_code == 200:
        logins.update(
            repo["owner"]["login"] for repo in collab_res.json() if repo.get("owner", {}).get("type") == "Organization"
        )
    return logins


async def get_user_accessible_logins(user: User, db: Session) -> set[str]:
    """Like get_accessible_logins, but degrades to an empty set (matches nothing) instead
    of raising when GitHub isn't connected -- used to scope read queries (dashboard, scan
    history) to "my own data", where "no GitHub connection" (including one whose token
    couldn't be refreshed) should mean "nothing to show yet", not an error.
    """
    if not user.github_access_token:
        return set()
    try:
        token = await get_valid_github_token(user, db)
    except HTTPException:
        return set()
    return await get_accessible_logins(token, user.github_username)


def repo_scope_clause(column, logins: set[str]):
    """SQLAlchemy filter clause restricting a denormalized "org/repo" string column to
    repos under one of `logins`. Every scan/vulnerability/dashboard query must be
    intersected with this -- it's what keeps one user's repos out of another user's view.
    Matches nothing at all if `logins` is empty, rather than silently falling through to
    "no restriction" (which would expose every repo in the database).
    """
    if not logins:
        return false()
    return or_(*(column.like(f"{login}/%") for login in logins))
