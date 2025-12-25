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
    full_name: Optional[str] = Body(None),
    # Company fields
    company_name: Optional[str] = Body(None),
    website: Optional[str] = Body(None),
    work_email: Optional[str] = Body(None),
    countries: Optional[str] = Body(None),
    cpv_codes: Optional[str] = Body(None),
    keywords_include: Optional[str] = Body(None),
    keywords_exclude: Optional[str] = Body(None),
    sectors: Optional[str] = Body(None), # Not in CompanyBase directly, maybe map to industry or ignore
    languages: Optional[str] = Body(None),
    team_size: Optional[str] = Body(None),
    tender_volume: Optional[str] = Body(None),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    """
    Register a new user and optional company.
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
        name=full_name, # Map full_name to name
        niche=niche or "General"
    )
    
    # Handle referral code if provided
    if referralCode:
        referrer = await db.users.find_one({"referralCode": referralCode})
        if referrer:
            user_in.referredBy = referrer["_id"]
    
    user_dict = user_in.model_dump()
    user_dict["password"] = get_password_hash(password)
    
    # Insert user first to get ID
    result = await db.users.insert_one(user_dict)
    user_id = result.inserted_id
    
    # Create Company if name provided
    if company_name:
        # Helper to split CSV strings
        def split_csv(val: Optional[str]) -> list:
            if not val: return []
            return [x.strip() for x in val.split(",") if x.strip()]

        from app.models.company import CompanyInDB
        
        company_data = CompanyInDB(
            company_name=company_name,
            website=website,
            contact_email=work_email or email,
            countries=split_csv(countries),
            cpv_codes=split_csv(cpv_codes),
            keywords_include=split_csv(keywords_include),
            keywords_exclude=split_csv(keywords_exclude),
            languages=split_csv(languages),
            team_size=team_size,
            tender_volume=tender_volume,
            industry=sectors, # Mapping sectors to industry
            owner_id=user_id,
            members=[user_id]
        )
        
        comp_res = await db.companies.insert_one(company_data.model_dump())
        
        # Link back to user
        await db.users.update_one(
            {"_id": user_id},
            {"$set": {"company_id": comp_res.inserted_id}}
        )
        # Fetch updated user for response
        new_user = await db.users.find_one({"_id": user_id})
    else:
        new_user = await db.users.find_one({"_id": user_id})
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user_id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
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
