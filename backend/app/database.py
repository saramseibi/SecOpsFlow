from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



_COLUMN_ADDITIONS: dict[str, dict[str, str]] = {
    "users": {
        "github_refresh_token": "VARCHAR(255)",
        "github_token_expires_at": "DATETIME",
        "github_refresh_token_expires_at": "DATETIME",
    },
    "scans": {
        "workflow_run_id": "VARCHAR(64)",
        "run_attempt": "INTEGER",
        "workflow_name": "VARCHAR(255)",
        "artifact_status": "VARCHAR(50)",
        "artifact_file_name": "VARCHAR(255)",
        "artifact_size_bytes": "INTEGER",
        "artifact_created_at": "DATETIME",
        "artifact_expires_at": "DATETIME",
        "artifact_last_checked_at": "DATETIME",
        "dast_workflow_run_id": "VARCHAR(64)",
        "dast_run_attempt": "INTEGER",
        "dast_workflow_name": "VARCHAR(255)",
        "dast_status": "VARCHAR(50)",
        "dast_artifact_status": "VARCHAR(50)",
        "dast_artifact_file_name": "VARCHAR(255)",
        "dast_artifact_size_bytes": "INTEGER",
        "dast_artifact_created_at": "DATETIME",
        "dast_artifact_expires_at": "DATETIME",
        "dast_artifact_last_checked_at": "DATETIME",
        "dast_only": "BOOLEAN",
    },
    "scanner_results": {
        "category": "VARCHAR(100)",
        "summary": "VARCHAR(255)",
    },
}



_COLUMN_WIDENINGS: dict[str, dict[str, str]] = {
    "vulnerabilities": {
      
        "installed_version": "TEXT",
    },
}


def run_startup_migrations() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    is_sqlite = engine.dialect.name == "sqlite"
    with engine.begin() as conn:
        for table, additions in _COLUMN_ADDITIONS.items():
            if table not in existing_tables:
                continue
            existing_columns = {col["name"] for col in inspector.get_columns(table)}
            for name, ddl_type in additions.items():
                if name not in existing_columns:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type} NULL"))
        if not is_sqlite:  # sqlite has no MODIFY COLUMN and TEXT/VARCHAR are interchangeable there anyway
            for table, widenings in _COLUMN_WIDENINGS.items():
                if table not in existing_tables:
                    continue
                existing_columns = {col["name"] for col in inspector.get_columns(table)}
                for name, ddl_type in widenings.items():
                    if name in existing_columns:
                        conn.execute(text(f"ALTER TABLE {table} MODIFY COLUMN {name} {ddl_type} NULL"))
