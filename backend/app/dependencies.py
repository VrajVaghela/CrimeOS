import uuid
from collections.abc import Callable

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.exceptions import AuthenticationError, AuthorizationError
from app.models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


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
