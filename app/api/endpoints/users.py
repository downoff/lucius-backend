from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from datetime import timedelta
from app.api import deps
from app.models.user import UserInDB, UserCreate
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter()

@router.post("/register")
async def register_user(
    email: str = Body(...),
    password: str = Body(...),
    referralCode: Optional[str] = Body(None),
    niche: Optional[str] = Body(None),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    """
    Register a new user. This endpoint matches the frontend's expected /api/users/register.
    """
    # Check if user already exists
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system."
        )
    
    # Create user object
    user_in = UserCreate(
        email=email,
        niche=niche or "General"
    )
    
    # Handle referral code if provided
    if referralCode:
        referrer = await db.users.find_one({"referralCode": referralCode})
        if referrer:
            user_in.referredBy = referrer["_id"]
    
    user_dict = user_in.model_dump()
    user_dict["password"] = get_password_hash(password)  # Store hashed password
    
    # Insert user
    result = await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(result.inserted_id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Fetch created user
    new_user = await db.users.find_one({"_id": result.inserted_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserInDB(**new_user).model_dump(by_alias=True, exclude={"password"}),
        "message": "User registered successfully"
    }

@router.get("/me", response_model=UserInDB)
async def read_user_me(
    current_user: UserInDB = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user
