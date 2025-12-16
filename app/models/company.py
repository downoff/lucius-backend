from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from app.models.common import MongoBaseModel, PyObjectId

class Invite(BaseModel):
    email: str
    role: str
    token: str
    expires_at: datetime

class Branding(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str = "#4F46E5"

class CompanyBase(BaseModel):
    company_name: str
    website: Optional[str] = None
    countries: List[str] = []
    cpv_codes: List[str] = []
    keywords_include: List[str] = []
    keywords_exclude: List[str] = []
    max_deadline_days: int = 45
    languages: List[str] = []
    contact_emails: List[str] = []
    team_size: Optional[str] = None
    tender_volume: Optional[str] = None
    
    # Usage
    proposals_count: int = 0
    proposals_limit: int = 10
    last_reset_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Billing
    is_paid: bool = False
    plan: Optional[str] = None
    last_payment_at: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    
    # Referrals
    referral_code: Optional[str] = None
    referrals_count: int = 0
    referral_credits: float = 0.0
    referred_by: Optional[str] = None
    
    # Enterprise
    branding: Branding = Field(default_factory=Branding)
    api_key: Optional[str] = None
    industry: Optional[str] = None
    contact_email: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyInDB(CompanyBase, MongoBaseModel):
    owner_id: Optional[PyObjectId] = None
    members: List[PyObjectId] = []
    invites: List[Invite] = []
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
