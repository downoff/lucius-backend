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
    
    # SEND VERIFICATION EMAIL (Auto)
    try:
        token = create_access_token(
            data={"sub": str(result.inserted_id), "type": "verification"},
            expires_delta=timedelta(hours=24)
        )
        from app.services import email_service
        base_url = "https://lucius-ai.onrender.com" 
        verification_link = f"{base_url}/verify-email?token={token}"
        
        html_content = f"""
        <p>Welcome to Lucius AI!</p>
        <p>Thanks for signing up. Please verify your email to secure your account:</p>
        <a href="{verification_link}">Verify Email</a>
        """
        await email_service.send_email(user_in.email, "Welcome to Lucius AI! Verify your email", html_content)
    except Exception as e:
        print(f"Failed to send signup verification email: {e}")

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
    
    # SEND EMAIL
    from app.services import email_service
    base_url = "https://lucius-ai.onrender.com" # Should be frontend URL from env
    recovery_link = f"{base_url}/reset-password?token={password_reset_token}" 
    
    html_content = f"""
    <p>You requested a password reset for Lucius AI.</p>
    <p>Click the link below to reset your password:</p>
    <a href="{recovery_link}">Reset Password</a>
    <p>If you didn't request this, ignore this email.</p>
    """
    
    await email_service.send_email(email, "Reset Your Password", html_content)
    
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
    
    # SEND EMAIL
    from app.services import email_service
    # In production, use settings.FRONTEND_URL or similar
    base_url = "https://lucius-ai.onrender.com" 
    verification_link = f"{base_url}/verify-email?token={token}"
    
    html_content = f"""
    <p>Welcome to Lucius AI!</p>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="{verification_link}">Verify Email</a>
    """
    
    await email_service.send_email(current_user.email, "Verify your email", html_content)
    
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

@router.post("/google")
async def google_login(
    payload: dict = Body(...),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    """
    Google Login/Signup
    Payload: { "token": "..." }
    """
    token = payload.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token required")

    import httpx
    
    # Verify token with Google
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google Token")
            google_data = resp.json()
    except Exception as e:
        print(f"Google Auth Error: {e}")
        raise HTTPException(status_code=400, detail="Google authentication failed")

    # Optional: Verify Audience matches Client ID
    # if settings.GOOGLE_CLIENT_ID and google_data.get("aud") != settings.GOOGLE_CLIENT_ID:
    #    raise HTTPException(status_code=400, detail="Invalid Client ID")

    email = google_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not found in Google Token")

    user_doc = await db.users.find_one({"email": email})
    
    if not user_doc:
        # Create User
        new_user = {
            "email": email,
            "full_name": google_data.get("name", ""),
            "password": get_password_hash("GOOGLE_AUTH_" + create_access_token({})), # Random unguessable password
            "google_id": google_data.get("sub"),
            "emailVerified": True, # Trusted from Google
            "picture": google_data.get("picture"),
        }
        result = await db.users.insert_one(new_user)
        user_id = str(result.inserted_id)
        user_doc = new_user
        user_doc["_id"] = result.inserted_id # Ensure it has ID for model wrap
    else:
        user_id = str(user_doc["_id"])
        # Update google_id if missing
        if "google_id" not in user_doc:
             await db.users.update_one({"_id": user_doc["_id"]}, {"$set": {"google_id": google_data.get("sub"), "picture": google_data.get("picture")}})

    # Generate JWT
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserInDB(**user_doc).model_dump(by_alias=True, exclude={"password"})
    }
