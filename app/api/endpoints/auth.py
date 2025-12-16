from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.api import deps
from app.models.user import UserCreate, UserInDB
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter()

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    # form_data.username is the email
    user_doc = await db.users.find_one({"email": form_data.username})
    if not user_doc:
         raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    user = UserInDB(**user_doc)
    if not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    # Return matched structure for frontend
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.model_dump(by_alias=True, exclude={"password"})
    }

@router.post("/register")
async def register(
    user_in: UserCreate,
    password: str = Body(...),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    user_doc = await db.users.find_one({"email": user_in.email})
    if user_doc:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    user_in.password = get_password_hash(password)
    user_dict = user_in.model_dump()
    
    # Insert
    result = await db.users.insert_one(user_dict)
    
    # Return token immediately? Or just user?
    # Let's return token to auto-login
    access_token = create_access_token(
        data={"sub": str(result.inserted_id)}, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    new_user = await db.users.find_one({"_id": result.inserted_id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserInDB(**new_user).model_dump(by_alias=True, exclude={"password"})
    }
