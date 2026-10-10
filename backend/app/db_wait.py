import logging
import os
import socket
import sys
import time
from urllib.parse import urlparse

from sqlalchemy import text

from app.config import sanitize_url, settings
from app.database import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("crimeos.db_wait")


def wait_for_database(max_retries: int = 15, delay_seconds: int = 2) -> bool:
    """Wait for database to be resolvable and reachable.

    Helps on cloud platforms like Render where PostgreSQL may take a few seconds
    to wake up or spin up.
    """
    raw_url = settings.DATABASE_URL
    sanitized = sanitize_url(raw_url)
    logger.info("Checking database connectivity for: %s", sanitized)

    # 1. Parse host and port
    try:
        parse_target = raw_url.replace("postgresql+psycopg://", "http://")
        parsed = urlparse(parse_target)
        host = parsed.hostname or "localhost"
        port = parsed.port or 5432
    except Exception as err:
        logger.warning("Could not parse host from DATABASE_URL: %s", err)
        host = "localhost"
        port = 5432

    # 2. DNS resolution check
    is_render = bool(os.environ.get("RENDER") or os.environ.get("RENDER_SERVICE_ID"))
    if host not in ("localhost", "127.0.0.1", "0.0.0.0"):
        try:
            socket.getaddrinfo(host, port)
            logger.info("Host '%s' successfully resolved via DNS.", host)
        except socket.gaierror as dns_err:
            logger.error("[DNS RESOLUTION ERROR] Could not resolve host '%s': %s", host, dns_err)
            if host.startswith("dpg-") and "." not in host:
                logger.error(
                    "\n============================================================\n"
                    "RENDER CONFIGURATION ISSUE DETECTED:\n"
                    "Host '%s' appears to be a Render Internal Database URL.\n"
                    "Internal Database URLs ONLY resolve if your Web Service and\n"
                    "PostgreSQL database are in the EXACT SAME region on Render.\n"
                    "\nTo fix this in your Render Dashboard:\n"
                    "1. Open your PostgreSQL database in the Render Dashboard.\n"
                    "2. Copy the 'External Database URL'.\n"
                    "3. Open your Web Service -> Environment tab.\n"
                    "4. Set DATABASE_URL to the External Database URL.\n"
                    "============================================================\n",
                    host,
                )
            elif is_render and host in ("localhost", "127.0.0.1"):
                logger.error(
                    "\n============================================================\n"
                    "RENDER CONFIGURATION ISSUE DETECTED:\n"
                    "DATABASE_URL is set to '%s', but Render containers do not run\n"
                    "a local database. Please set DATABASE_URL in your Web Service\n"
                    "Environment Variables to your Render PostgreSQL connection string.\n"
                    "============================================================\n",
                    host,
                )
            return False

    # 3. Connection attempt with retries
    logger.info("Attempting database connection (up to %d retries)...", max_retries)
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection established successfully on attempt %d.", attempt)
            return True
        except Exception as exc:
            logger.warning(
                "Attempt %d/%d failed: %s. Retrying in %ds...",
                attempt,
                max_retries,
                exc,
                delay_seconds,
            )
            time.sleep(delay_seconds)

    logger.warning(
        "[WARNING] Could not connect to database after %d attempts. "
        "Proceeding with web service startup so diagnostic endpoints remain accessible.",
        max_retries,
    )
    return False


if __name__ == "__main__":
    success = wait_for_database()
    # Exit with code 0 to allow web server to boot and report health
    sys.exit(0)
