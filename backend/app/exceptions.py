import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, SQLAlchemyError

logger = logging.getLogger("crimeos.exceptions")


class AppError(Exception):
    code = "app_error"
    status_code = 400

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class AuthenticationError(AppError):
    code = "authentication_failed"
    status_code = 401


class AuthorizationError(AppError):
    code = "authorization_failed"
    status_code = 403


class NotFoundError(AppError):
    code = "not_found"
    status_code = 404


class GenerationError(AppError):
    code = "generation_failed"
    status_code = 502


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.exception_handler(OperationalError)
    async def handle_db_operational_error(_: Request, exc: OperationalError) -> JSONResponse:
        logger.error("Database operational error: %s", exc)
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "database_unavailable",
                    "message": "Database is currently unreachable. Please check DATABASE_URL and ensure your database service is running.",
                    "detail": str(exc.orig) if hasattr(exc, "orig") else str(exc),
                }
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def handle_sqlalchemy_error(_: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.error("Database error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "database_error",
                    "message": "A database error occurred while processing the request.",
                }
            },
        )

