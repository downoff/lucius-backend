from fastapi import APIRouter, Depends, HTTPException, Body
from app.api import deps
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr
from datetime import datetime

router = APIRouter()

class InterestRequest(BaseModel):
    email: EmailStr
    source: str = "investor_landing"  # investor_landing, waitlist, viral_share

@router.post("/interest")
async def register_interest(
    data: InterestRequest,
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
    """
    Capture investor or user interest (Waitlist).
    """
    existing = await db.leads.find_one({"email": data.email})
    if existing:
        return {"status": "already_registered", "message": "You are already on the list!"}
    
    lead = {
        "email": data.email,
        "source": data.source,
        "created_at": datetime.utcnow(),
        "status": "new"
    }
    
    await db.leads.insert_one(lead)
    
    # In a real app, trigger a Slack webhook here
    print(f"💰 New Lead Captured: {data.email} via {data.source}")
    
    return {"status": "success", "message": "Access requested successfully."}
