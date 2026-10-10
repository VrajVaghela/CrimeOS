import logging
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import sanitize_url, settings

logger = logging.getLogger("crimeos.database")


class Base(DeclarativeBase):
    pass


# Log sanitized connection target on initialization
logger.info("Initializing database engine for: %s", sanitize_url(settings.DATABASE_URL))

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=15,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def check_db_connection() -> tuple[bool, str]:
    """Test database connectivity with SELECT 1."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "Database connection healthy"
    except Exception as exc:
        logger.warning("Database connectivity check failed: %s", exc)
        return False, str(exc)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except OperationalError as exc:
        db.rollback()
        logger.error("Database operational error during request: %s", exc)
        raise
    finally:
        db.close()

