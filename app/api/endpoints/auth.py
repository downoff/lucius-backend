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

@router.post("/password-recovery/{email}")
async def recover_password(email: str, db: AsyncIOMotorDatabase = Depends(deps.get_db)) -> Any:
    """
    Password Recovery
    """
    user = await db.users.find_one({"email": email})

    if not user:
        # Don't reveal that the user doesn't exist? 
        # For this stage, let's be helpfully silent or return success message to prevent enumeration
        # But for debugging, maybe return success 
        return {"msg": "If this email exists, a recovery email has been sent."}
    
    password_reset_token = create_access_token(
        data={"sub": str(user["_id"]), "type": "recovery"},
        expires_delta=timedelta(hours=1)
    )
    
    # MOCK EMAIL SENDING
    print(f"============================================")
    print(f"[EMAIL MOCK] Password Recovery for {email}")
    print(f"Token: {password_reset_token}")
    print(f"Link: /reset-password?token={password_reset_token}")
    print(f"============================================")
    
    return {"msg": "Password recovery email sent"}

@router.post("/reset-password")
async def reset_password(
    token: str = Body(...),
    new_password: str = Body(...),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    """
    Reset password
    """
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "recovery":
             raise HTTPException(status_code=400, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")
        
    user = await db.users.find_one({"_id": deps.ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    hashed_password = get_password_hash(new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hashed_password}}
    )
    return {"msg": "Password updated successfully"}

@router.post("/request-verification")
async def request_verification(
    current_user: UserInDB = Depends(deps.get_current_user), 
) -> Any:
    """
    Request Email Verification
    """
    token = create_access_token(
        data={"sub": str(current_user.id), "type": "verification"},
        expires_delta=timedelta(hours=24)
    )
    
    # MOCK EMAIL SENDING
    print(f"============================================")
    print(f"[EMAIL MOCK] Email Verification for {current_user.email}")
    print(f"Token: {token}")
    print(f"Link: /verify-email?token={token}")
    print(f"============================================")
    
    return {"msg": "Verification email sent"}

@router.get("/verify-email")
async def verify_email(token: str, db: AsyncIOMotorDatabase = Depends(deps.get_db)) -> Any:
    """
    Verify Email
    """
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "verification":
             raise HTTPException(status_code=400, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")
        
    await db.users.update_one(
        {"_id": deps.ObjectId(user_id)},
        {"$set": {"emailVerified": True}}
    )
    return {"msg": "Email verified successfully"}
