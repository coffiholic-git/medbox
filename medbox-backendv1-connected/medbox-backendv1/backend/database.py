"""
Data Layer (Section 9, Layer 5)

SQLite for local development, PostgreSQL for anything beyond a
single-user demo, both through the same SQLAlchemy ORM code so the
migration path is just swapping DATABASE_URL — no rewrite.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Default: local SQLite file next to this module (dev).
# Set DATABASE_URL to a postgresql:// URL in production (see docker-compose.yml).
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'medbox.db')}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency that yields a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create tables and seed demo data on startup."""
    from backend import models  # noqa: F401 (registers models on Base metadata)

    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        from backend.seed import seed_if_empty

        seed_if_empty(db)
    finally:
        db.close()
