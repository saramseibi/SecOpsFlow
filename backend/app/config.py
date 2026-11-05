import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./devsecops.db")

# Shared secret the GitHub Actions workflow must send as "Authorization: Bearer <token>"
# when POSTing scan results to /api/ingest/scan.
INGEST_API_TOKEN = os.getenv("INGEST_API_TOKEN", "changeme-dev-token")

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:4028").split(",")
    if origin.strip()
]


JWT_SECRET = os.getenv("JWT_SECRET", "changeme-dev-secret-do-not-use-in-production")
if IS_PRODUCTION and JWT_SECRET == "changeme-dev-secret-do-not-use-in-production":
    raise RuntimeError(
        "JWT_SECRET must be set to a strong random value when ENVIRONMENT=production."
    )

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", str(60 * 24 * 7)))  # 7 days

# GitHub App OAuth credentials, used to let a signed-in user connect their GitHub account.
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")

# GitHub App identity, used to mint installation access tokens for bot/automation calls.
GITHUB_APP_ID = os.getenv("GITHUB_APP_ID", "")
GITHUB_APP_PRIVATE_KEY = os.getenv("GITHUB_APP_PRIVATE_KEY", "")
GITHUB_APP_PRIVATE_KEY_PATH = os.getenv("GITHUB_APP_PRIVATE_KEY_PATH", "")
if not GITHUB_APP_PRIVATE_KEY and GITHUB_APP_PRIVATE_KEY_PATH:
    _key_path = Path(GITHUB_APP_PRIVATE_KEY_PATH)
    if not _key_path.is_absolute():
        _key_path = Path(__file__).resolve().parent.parent / _key_path
    if _key_path.is_file():
        GITHUB_APP_PRIVATE_KEY = _key_path.read_text()

# Secret used to verify the HMAC signature GitHub sends with each webhook delivery.
GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")

# Substring used to pick out the security-scan workflow among a repo's registered workflows
# (matched case-insensitively against each workflow's name and file path). Repos aren't
# required to name their workflow file the same thing, so this is a hint, not a fixed path.
GITHUB_WORKFLOW_NAME_HINT = os.getenv("GITHUB_WORKFLOW_NAME_HINT", "security-scan")

# Comma-separated substrings used to recognize a repo's DAST workflow_run events (matched
# case-insensitively against each run's name and file path -- e.g. an "OWASP ZAP Active
# Scan" workflow matches on "zap"). Unlike the security-scan workflow above, these are never
# dispatched by this app -- they run on their own trigger in the target repo -- so their
# completed runs are matched to an existing Scan by repository + commit sha instead of by an
# embedded scan_id.
GITHUB_DAST_WORKFLOW_NAME_HINTS = [
    hint.strip().lower()
    for hint in os.getenv("GITHUB_DAST_WORKFLOW_NAME_HINT", "dast,zap").split(",")
    if hint.strip()
]

# LLM used for the "AI explanation & remediation" feature on a finding. AI_PROVIDER is
# "gemini" (free tier available) or "anthropic"; left empty, it picks whichever key is set.
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
AI_PROVIDER = os.getenv("AI_PROVIDER", "").lower() or ("gemini" if GEMINI_API_KEY else "anthropic")
AI_MODEL = os.getenv("AI_MODEL", "") or ("gemini-flash-latest" if AI_PROVIDER == "gemini" else "claude-sonnet-5-5")
# Tried in order when AI_MODEL is overloaded/unavailable (Gemini's free tier often returns 503).
AI_FALLBACK_MODELS = [
    m.strip()
    for m in (
        os.getenv("AI_FALLBACK_MODELS")
        or ("gemini-3.5-flash,gemini-flash-lite-latest" if AI_PROVIDER == "gemini" else "")
    ).split(",")
    if m.strip()
]

# Name of the consolidated JSON report artifact the Scan Overview page's "JSON Artifact"
# card tracks -- separate from each job's own scan-result.json artifact.
CI_REPORT_ARTIFACT_NAME = os.getenv("CI_REPORT_ARTIFACT_NAME", "ci-security-report")
