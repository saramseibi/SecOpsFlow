import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import Base, engine, run_startup_migrations
import models  # noqa: F401 (registers all models on Base.metadata before create_all)
from routes.auth import router as auth_router
from routes.dashboard import router as dashboard_router
from routes.github import router as github_router
from routes.scans import router as scans_router
from routes.vulnerabilities import router as vulnerabilities_router
from routes.webhook import router as webhook_router
from routes.webhook import run_scan_reconciler

Base.metadata.create_all(bind=engine)
run_startup_migrations()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Finalizes scans whose workflow_run webhook never arrived (see routes/webhook.py).
    reconciler = asyncio.create_task(run_scan_reconciler())
    yield
    reconciler.cancel()


app = FastAPI(title="SecOpsFlow API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(github_router)
app.include_router(scans_router)
app.include_router(vulnerabilities_router)
app.include_router(webhook_router)


@app.get("/health")
def health():
    return {"status": "ok"}
