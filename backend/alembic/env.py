from logging.config import fileConfig
import os

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine.url import make_url

# 1. Print raw unmodified DATABASE_URL from os.environ (mask password) at top of env.py
raw_env_url = os.environ.get("DATABASE_URL")
if raw_env_url:
    try:
        _raw_parsed = make_url(raw_env_url)
        print(f"[ALEMBIC RAW ENV] os.environ['DATABASE_URL'] = {_raw_parsed.render_as_string(hide_password=True)}")
    except Exception as _e:
        print(f"[ALEMBIC RAW ENV] os.environ['DATABASE_URL'] is set but parse error: {_e}")
else:
    print("[ALEMBIC RAW ENV] os.environ['DATABASE_URL'] is NOT set in OS environment!")

from app.config import settings
from app.database import Base
from app.models import *  # noqa: F401,F403

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    db_url = make_url(settings.DATABASE_URL)
    print(f"[ALEMBIC DEBUG] Connecting to DB URL: {db_url.render_as_string(hide_password=True)}")
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
