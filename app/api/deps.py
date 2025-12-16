from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Header
from jose import jwt, JWTError
from app.core.config import settings
from app.core.database import get_database
from app.models.user import UserInDB
from app.core.security import verify_password # re-export if needed or used
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

async def get_db() -> AsyncIOMotorDatabase:
    from app.core.database import db
    return db.db

# Reusable dependency to get current user from x-auth-token header
async def get_current_user(
    x_auth_token: str = Header(..., alias="x-auth-token"),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(x_auth_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
    return UserInDB(**user)

async def get_current_active_user(
    current_user: UserInDB = Depends(get_current_user),
) -> UserInDB:
    # if not current_user.is_active: raise HTTPException...
    return current_user
