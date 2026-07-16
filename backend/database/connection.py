"""
Database Connection — Async SQLAlchemy Engine & Session Factory
================================================================
Provides the asynchronous database engine and session management for
the video incident analyzer. Uses asyncpg as the PostgreSQL driver
for high-performance async I/O.

Usage:
    from database.connection import get_db_session, engine

    async with get_db_session() as session:
        result = await session.execute(query)

Architecture Notes:
    - Engine is created lazily on first import using DATABASE_URL from config
    - Session factory uses expire_on_commit=False to allow accessing loaded
      attributes after commit without triggering lazy loads
    - The async context manager handles commit/rollback automatically
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from config import get_settings

# ── Engine Configuration ─────────────────────────────────────────────────────
# Create async engine with connection pooling. pool_pre_ping ensures stale
# connections are detected and recycled automatically.
settings = get_settings()
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Set to True for SQL query logging during development
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,  # Recycle connections after 1 hour
)

# ── Session Factory ──────────────────────────────────────────────────────────
# expire_on_commit=False prevents lazy-load errors when accessing attributes
# on model instances after the session has been committed.
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional database session scope.

    Yields an async SQLAlchemy session that automatically commits on
    successful exit or rolls back on exception. The session is always
    closed after the block exits.

    Yields:
        AsyncSession: An active async database session.

    Raises:
        Exception: Re-raises any exception after rolling back the transaction.

    Example:
        async with get_db_session() as session:
            result = await session.execute(select(VideoCase))
            cases = result.scalars().all()
    """
    session = async_session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database session injection.

    Designed to be used with FastAPI's Depends() for automatic
    session lifecycle management in route handlers.

    Yields:
        AsyncSession: An active async database session.

    Example:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    """
    async with get_db_session() as session:
        yield session
