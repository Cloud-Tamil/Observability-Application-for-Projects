from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.security import create_access_token, verify_password
from ...models import User
from ...schemas import TokenRequest, TokenResponse
from ..deps import db_session

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=TokenResponse)
async def issue_token(body: TokenRequest, db: AsyncSession = Depends(db_session)):
    user = (await db.execute(select(User).where(User.username == body.username))).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")
    token = create_access_token(user.username, scopes=user.scopes.split(","))
    return TokenResponse(access_token=token, expires_in=settings.jwt_ttl_seconds)
