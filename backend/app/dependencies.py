from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session
from .database import get_db
from .models.core import Role, User
from .utils.security import decode_access_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub"))
        business_id = int(payload.get("business_id"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = db.get(User, user_id)
    if not user or not user.is_active or user.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    return user


def has_permission(user: User, permission: str, db: Session) -> bool:
    role = db.get(Role, user.role_id) if user.role_id else None
    permissions = (role.permissions or {}) if role else {}
    return bool(permissions.get("all") or permissions.get(permission))


def require_permission(user: User, permission: str, db: Session) -> User:
    if not has_permission(user, permission, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
    return user
