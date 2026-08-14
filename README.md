<div align="center">

# SecOpsFlow

**A DevSecOps vulnerability management dashboard for GitHub Actions security pipelines.**

Turns your CI security scans (SAST, dependency audit, secrets, tests, DAST) into a
single, browsable source of truth — per repository, per branch, per commit.

[![Frontend](https://img.shields.io/badge/frontend-Next.js%2015-000000)](#)
[![Backend](https://img.shields.io/badge/backend-FastAPI-009688)](#)
[![Language](https://img.shields.io/badge/language-TypeScript%20%7C%20Python-3178C6)](#)
[![License](https://img.shields.io/badge/license-Unlicensed-lightgrey)](#)

</div>

---



## Overview

SecOpsFlow is a  application made of two cooperating apps:

| App | Stack | Responsibility |
|---|---|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS  | Dashboard UI, auth session, thin API proxy to the backend |
| **Backend** | FastAPI, SQLAlchemy, Pydantic | Owns the database, GitHub integration, scan ingestion, all business logic |


### What it actually does

1. A user connects a GitHub account (OAuth) and installs a **GitHub App** on
   their org/repos.
2. A repository scan is triggered either:
   - **Automatically** — a GitHub App webhook fires when a pull request is
     opened or updated, and the backend dispatches the repo's security-scan
     GitHub Actions workflow (`workflow_dispatch`).
   - **Manually** — the "Run Scan Now" action in the UI, picking a branch and
     a workflow.
3. The backend creates a `Scan` row immediately (`status = running`) and
   hands the workflow a `scan_id`, so results can be matched back to it once
   CI finishes.
4. The CI workflow runs your security tools and uploads a `scan-result.json`
   artifact per job.
5. When GitHub reports the run as `completed`, a `workflow_run` webhook hits
   the backend. It downloads the artifact(s) via a GitHub App installation
   token, normalizes every tool's findings into a common `Vulnerability`
   shape, and rolls severity counts up onto the `Scan`.
6. The dashboard shows scan history, per-scan job breakdowns, a searchable
   and filterable vulnerability list, and trend charts.

A DAST (dynamic scan, e.g. OWASP ZAP) leg is tracked separately: its own
workflow run, status, and artifact columns live on the same `Scan` row,
since it typically runs against a deployed environment rather than the PR's
code directly.

---

## How a scan flows through the system

```
 ┌─────────────┐   PR opened/updated     ┌───────────────────────┐
 │   GitHub     │ ───────────────────────▶│  POST /api/github/     │
 │  (App        │                          │  webhook                │
 │  webhook)    │   workflow_run event     │  (signature-verified)   │
 └─────────────┘ ───────────────────────▶ └───────────┬─────────────┘
                                                        │
                        create Scan(running)             │  dispatch workflow /
                        ◀──────────────────────────────┤  download result artifact
                                                        │
                                                        ▼
                                          ┌────────────────────────────┐
                                          │   scan_service.py            │
                                          │   normalize + persist         │
                                          │   Vulnerability rows            │
                                          └───────────┬────────────────────┘
                                                        │
                                                        ▼
                                          ┌────────────────────────────┐
                                          │   Database                   │
                                          │   (SQLite / MySQL / Postgres) │
                                          └───────────┬────────────────────┘
                                                        │
     Browser ── Next.js pages ── API routes (proxy) ───▶ FastAPI read endpoints
```

---

## Architecture

```
devsecops/
├── src/                 Next.js frontend  (pages, components, API proxy)
└── backend/              FastAPI backend  (routes, models, GitHub App logic)
```

- **Frontend pages** (`src/app/**/page.tsx`) render server components that
  call the frontend's own `/api/**` routes.
- **Frontend API routes** (`src/app/api/**`) are the only place `BACKEND_URL`
  and the raw session JWT are used — nothing client-side ever calls the
  backend directly.
- **`src/middleware.ts`** verifies the session cookie on every protected
  route and redirects unauthenticated visitors to `/signup`.
- **Backend routers** (`backend/routes/*.py`) are grouped by domain: `auth`,
  `github` (OAuth + repo/branch/workflow listing + manual scan trigger),
  `webhook` (GitHub App events), `scans`, `vulnerabilities`, `dashboard`.
- **`backend/app/scan_service.py`** is the single place that owns a scan's
  lifecycle: created pending → results ingested → finalized.
- **`backend/app/normalizers.py`** converts each tool's raw JSON into
  `Vulnerability` rows with a computed `fingerprint`.
- **`backend/app/job_config.py`** is the only file you touch to teach the
  system about a new CI scanner (display label, category, summary logic).

---

## Repository layout

```
devsecops/
├── src/                            Next.js frontend
│   ├── app/
│   │   ├── page.tsx                Dashboard — KPIs, charts, recent vulnerabilities
│   │   ├── scans/                  Scan list + per-scan detail / job results
│   │   ├── vulnerabilities/        Vulnerability list, filters, detail view
│   │   ├── settings/               Account + GitHub connection settings
│   │   ├── signup/                 Sign up / sign in
│   │   └── api/                    Server-only proxy routes → FastAPI backend
│   ├── components/                 Shared layout (Sidebar, Topbar, AppLayout)
│   ├── lib/auth.ts                 Session cookie + JWT secret helpers
│   └── middleware.ts               Redirects unauthenticated users to /signup
│
├── backend/                        FastAPI backend
│   ├── app/
│   │   ├── main.py                 App entrypoint, router registration, CORS
│   │   ├── config.py               Env-driven settings
│   │   ├── database.py             SQLAlchemy engine/session, startup migrations
│   │   ├── security.py             Password hashing, JWT issue/verify
│   │   ├── access.py               GitHub token refresh + access-scope helpers
│   │   ├── github_app.py           GitHub App auth, workflow dispatch, artifacts
│   │   ├── job_config.py           Metadata + summaries for each CI scanner job
│   │   ├── normalizers.py          Raw scan-result.json → Vulnerability rows
│   │   └── scan_service.py         Scan lifecycle: create → ingest → finalize
│   ├── models/                     SQLAlchemy models: User, Repository, Scan, Vulnerability
│   ├── routes/                     auth, github, scans, vulnerabilities, dashboard, webhook
│   ├── shemas/                     Pydantic request/response schemas
│   └── requirements.txt
│
├── .env.example                    Frontend env vars
├── backend/.env.example            Backend env vars
└── package.json
```

---

## Data model

| Model | Purpose |
|---|---|
| **`User`** | Email/password account, plus an optional linked GitHub OAuth identity (access/refresh tokens + expiry) used to call the GitHub API on the user's behalf. |
| **`Repository`** | A GitHub repo, upserted the first time it's seen (via the `/repos` listing or a webhook). Tracks default branch and last-scanned commit. |
| **`Scan`** | One CI run for one commit/PR — status, timing, severity roll-up counts — plus, separately, the DAST run's own status/artifact columns. |
| **`ScannerResult`** | Per-tool outcome within a scan (e.g. *"semgrep completed, 12 findings"*), used to render the Scan Overview's job table. |
| **`Vulnerability`** | A single normalized finding from any scanner — severity, CWE/CVE, file/line, fix info, and a `fingerprint` used for de-duplication and status tracking. |

Severity is one of `critical | high | medium | low | info`.
Vulnerability `status` starts as `open` and can be moved to `resolved` (or
similar) individually or in bulk.

---

## Authentication model

SecOpsFlow deliberately separates three different credentials:

1. **App session** — email/password sign-up/sign-in against the backend
   (bcrypt-hashed), which issues a JWT. The frontend stores it in an
   HTTP-only cookie (`session`, see `src/lib/auth.ts`) and verifies it in
   `src/middleware.ts` to gate every page except `/signup`. Frontend API
   routes re-attach it as `Authorization: Bearer <token>` when calling the
   backend — the backend never sees the cookie, only the token.
   **`JWT_SECRET` must be identical** in `.env` and `backend/.env`, since
   both sides sign/verify the same token.
2. **User's GitHub OAuth link** — connected from Settings, used to list the
   orgs/repos/branches/workflows the signed-in user can see, and to trigger
   manual scans on their behalf.
3. **GitHub App** — a separate, non-user-tied identity the backend uses for
   server-to-server operations: dispatching workflows, listing artifacts,
   downloading `scan-result.json`, and verifying inbound webhook signatures
   (`GITHUB_WEBHOOK_SECRET`).

All list/detail endpoints are further scoped server-side to the
organizations and repositories the authenticated user can actually see on
GitHub — a user can never read another account's scans or findings by
guessing an id.

---

## API reference

All endpoints below (except `/health` and the webhook) require
`Authorization: Bearer <session JWT>` and are scoped to the caller's own
GitHub access.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/signup` | Create an account, returns a session token |
| `POST` | `/api/auth/signin` | Sign in, returns a session token |
| `GET` | `/api/auth/me` | Current user profile |
| `PATCH` | `/api/auth/password` | Change password |
| `DELETE` | `/api/auth/me` | Delete account |
| `POST` | `/api/github/connect` | Exchange an OAuth code, link a GitHub account |
| `DELETE` | `/api/github/disconnect` | Unlink the GitHub account |
| `GET` | `/api/github/orgs` | Orgs the connected account can see |
| `GET` | `/api/github/repos?org=` | Repos in an org (or the personal account) |
| `GET` | `/api/github/repos/branches?repository_id=` | Branches for a repo |
| `GET` | `/api/github/repos/workflows?repository_id=&branch=` | Workflows dispatchable on a branch |
| `POST` | `/api/github/repos/scan` | Manually trigger a scan ("Run Scan Now") |
| `POST` | `/api/github/webhook` | GitHub App webhook receiver (`pull_request`, `workflow_run`, `installation`) — HMAC-signature verified, not user-authenticated |
| `GET` | `/api/scans` | Paginated, filterable scan list |
| `GET` | `/api/scans/summary` | Aggregate counts (completed/failed/running, avg duration, total findings) |
| `GET` | `/api/scans/{scan_id}` | Single scan detail, incl. per-job `ScannerResult`s |
| `POST` | `/api/scans/{scan_id}/artifact/refresh` | Re-check the CI artifact's status on GitHub |
| `GET` | `/api/scans/{scan_id}/artifact/download` | Stream the raw CI report artifact from GitHub |
| `GET` | `/api/vulnerabilities` | Paginated, filterable vulnerability list |
| `GET` | `/api/vulnerabilities/filters` | Distinct scanner/repository/type values, for filter dropdowns |
| `GET` | `/api/vulnerabilities/{vuln_id}` | Single finding detail |
| `PATCH` | `/api/vulnerabilities/{vuln_id}` | Update one finding's status |
| `PATCH` | `/api/vulnerabilities/bulk/update` | Update many findings' status at once |
| `GET` | `/api/dashboard/summary` | Open/resolved counts by severity, MTTR, scans this week |
| `GET` | `/api/dashboard/trend?days=` | Daily vulnerability counts, zero-filled |
| `GET` | `/api/dashboard/scanner-stats` | Open findings grouped by scanner |
| `GET` | `/api/dashboard/recent-vulnerabilities?limit=` | Most recently detected findings |
| `GET` | `/health` | Liveness check (no auth) |

Interactive Swagger docs are available at `http://localhost:8010/docs` once
the backend is running.

---

## Scan-result contract (what CI must produce)

For each job that should show up as a row in the Scan Overview, upload a
`scan-result.json` artifact (bundled inside a `ci-security-report` artifact,
one file per tool):

```json
{
  "scanner": "semgrep",
  "status": "completed",
  "duration_seconds": 12,
  "summary": "optional human-readable summary",
  "findings": [
    {
      "title": "SQL injection in query builder",
      "severity": "high",
      "file_path": "src/foo.php",
      "line_number": 42,
      "cve": "CVE-2024-XXXXX",
      "cwe": "CWE-89",
      "cvss_score": 7.5,
      "dependency": "some/package",
      "installed_version": "1.2.3",
      "fixed_version": "1.2.4",
      "recommendation": "Use parameterized queries."
    }
  ]
}
```

- `scanner` must match a key in `backend/app/job_config.py`'s `JOB_CONFIG`
  — out of the box: `phpunit`, `composer-audit`, `npm-audit`, `semgrep`,
  `larastan`, `php-insights`, `security-tests`, `dast`. Add an entry there
  to support another tool; nothing in the ingestion path needs to change.
- `status` is one of `completed | failed | skipped | cancelled` — only
  `completed` results have their `findings` normalized and stored.
- Findings are normalized by `backend/app/normalizers.py` into
  `Vulnerability` rows, de-duplicated via a computed `fingerprint`.
- DAST results follow a different path (`ingest_zap_result`): the backend
  downloads a raw OWASP ZAP report artifact directly, not the
  `scan-result.json` convention, and normalizes it separately.

---


---

## Setup

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
copy .env.example .env       # then fill in the values (see below)

uvicorn app.main:app --reload --port 8010
```



### 2. Frontend (Next.js)

```bash
# from the repo root
npm install
copy .env.example .env       # then fill in the values (see below)

npm run dev
```


### 3. GitHub App / webhook wiring

1. Create a GitHub App with:
   - **Webhook URL** → your backend's `/api/github/webhook` (use the
     smee.io proxy URL locally, forwarded via `GITHUB_WEBHOOK_PROXY_URL`).
   - **Permissions**: Actions (read/write — dispatch workflows, read
     artifacts), Contents (read), Pull requests (read), Metadata (read).
   - **Subscribe to events**: `pull_request`, `workflow_run`.
2. Generate a private key and save it as
   `backend/github_app_private_key.pem` (or set `GITHUB_APP_PRIVATE_KEY` to
   its raw contents, for hosts without a writable filesystem).
3. Install the App on the org/repos you want scanned.
4. In your target repository's GitHub Actions workflow, accept
   `workflow_dispatch` inputs `scan_id`, `trigger`, `commit_sha` /
   `pr_number` and have each job write its `scan-result.json` into a
   `ci-security-report` artifact — see
   [Scan-result contract](#scan-result-contract-what-ci-must-produce).

---

## Environment variables

### `backend/.env`

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | e.g. `sqlite:///./devsecops.db` for dev, or a `mysql+pymysql://...` / Postgres URL for prod |
| `INGEST_API_TOKEN` | Shared secret for any direct result-posting path outside the webhook/artifact flow |
| `CORS_ORIGINS` | Comma-separated origins allowed to call this API (your frontend's URL) |
| `JWT_SECRET` / `JWT_EXPIRE_MINUTES` | Session signing — **must match the frontend's `JWT_SECRET`** |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth App, used for "Connect GitHub" |
| `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY_PATH` (or `GITHUB_APP_PRIVATE_KEY`) | GitHub App identity, used to mint installation tokens |
| `GITHUB_WEBHOOK_SECRET` / `GITHUB_WEBHOOK_PROXY_URL` | Verifies inbound webhook signatures; proxy URL is for local dev via smee.io |

### `.env` (frontend)

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | Where the Next.js API routes reach the backend (server-only, e.g. `http://localhost:8010`) |
| `JWT_SECRET` | **Must match** `backend/.env`'s `JWT_SECRET` |
| `GITHUB_CLIENT_ID` | Same GitHub OAuth App as the backend (the secret stays backend-only) |

See `.env.example` / `backend/.env.example` for the complete, current list.

---

## Everyday development

```bash
# Frontend
npm run dev          # dev server on :4028
npm run build          # production build
npm run lint            # ESLint
npm run lint:fix         # ESLint, autofix
npm run format            # Prettier
npm run type-check         # tsc --noEmit

# Backend (with venv activated, from backend/)
uvicorn app.main:app --reload --port 8010
```

Both servers must be running for the app to function end-to-end — the
frontend is a UI shell over the backend's API and cannot render real data on
its own.

---

## Tech stack

**Frontend** — Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts
(charts), `jose` (JWT verification in middleware), `sonner` (toasts).

**Backend** — FastAPI, SQLAlchemy 2.x, Pydantic 2.x, PyJWT, bcrypt, httpx
(GitHub API calls), uvicorn.

**Auth** — Email/password + JWT session cookie (frontend-issued cookie,
backend-issued token, shared secret), a separate user-level GitHub OAuth
link, and a separate GitHub App for server-to-server automation.
