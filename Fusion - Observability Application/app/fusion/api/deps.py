from collections.abc import AsyncIterator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.db import get_session
from ..core.security import decode_token

_bearer = HTTPBearer(auto_error=False)


async def db_session() -> AsyncIterator[AsyncSession]:
    async for s in get_session():
        yield s


async def current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    try:
        payload = decode_token(creds.credentials)
    except Exception as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"invalid token: {exc}") from exc
    return {"sub": payload.get("sub"), "scopes": payload.get("scopes", [])}


def require_scope(scope: str):
    async def _dep(user: dict = Depends(current_user)) -> dict:
        if scope not in user.get("scopes", []):
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"missing scope: {scope}")
        return user
    return _dep
