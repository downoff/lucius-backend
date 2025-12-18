from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.common import MongoBaseModel, PyObjectId

class UserBase(BaseModel):
    model_config = ConfigDict(extra='ignore')
    email: EmailStr
    name: Optional[str] = None
    full_name: Optional[str] = None  # Legacy
    googleId: Optional[str] = None
    stripeCustomerId: Optional[str] = None
    twitterId: Optional[str] = None
    twitterUsername: Optional[str] = None
    isPro: bool = False
    credits: int = 10
    brandVoicePrompt: str = "You are an expert social media marketer."
    hasOnboarded: bool = False
    onboarding_completed: bool = False # Legacy
    emailVerified: bool = False
    niche: str = "General"
    referralCode: Optional[str] = None
    role: str = "owner"
    
    # Legacy/Admin fields
    is_active: bool = True
    is_superuser: bool = False
    
    # Relations
    company_id: Optional[PyObjectId] = None
    referredBy: Optional[PyObjectId] = None
    invited_by: Optional[PyObjectId] = None

class UserCreate(UserBase):
    password: Optional[str] = None

class UserInDB(UserBase, MongoBaseModel):
    password: Optional[str] = None # Hashed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Alias for type hinting in endpoints
User = UserInDB
