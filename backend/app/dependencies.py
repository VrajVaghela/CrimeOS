import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.exceptions import AuthenticationError, AuthorizationError
from app.models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Phase 14A — languages the UI can request for AI-generated output.
SUPPORTED_LANGS: frozenset[str] = frozenset({"en", "hi", "gu"})
DEFAULT_LANG = "en"


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        subject = payload.get("sub")
        user_id = uuid.UUID(subject)
    except (JWTError, TypeError, ValueError) as exc:
        raise AuthenticationError("Invalid or expired token") from exc
    user = db.get(User, user_id)
    if not user:
        raise AuthenticationError("User no longer exists")
    return user


def require_role(*roles: UserRole) -> Callable[[User], User]:
    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise AuthorizationError("This action is not available for your role")
        return user

    return dependency


async def get_lang(x_lang: Annotated[str | None, Header(alias="X-Lang")] = None) -> str:
    """Resolve the caller's active UI language from the `X-Lang` header.

    The frontend sets this on every request (see `setActiveLang` in lib/api.ts), so
    AI endpoints can generate output in the officer's language without each call
    site threading a `lang` argument. Unknown or absent values fall back to English
    rather than erroring — a missing header must never break a request.
    """
    if x_lang:
        candidate = x_lang.strip().lower()[:2]
        if candidate in SUPPORTED_LANGS:
            return candidate
    return DEFAULT_LANG
