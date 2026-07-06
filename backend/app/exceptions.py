from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


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
