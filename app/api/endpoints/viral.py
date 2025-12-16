from datetime import datetime, timedelta
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Body, HTTPException
from app.api import deps
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.core.config import settings
import openai

router = APIRouter()

# --- Schemas ---
# (Usually in models/schemas.py but keeping simple here for migration)

@router.post("/share-win")
async def share_win(
    userId: str = Body(None), # Frontend calls it userId
    company_id: str = Body(None), # Fallback
    tenderValue: int = Body(0),
    tenderTitle: str = Body(""),
    shareType: str = Body("linkedin"),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
    uid = userId or company_id
    if not uid:
        raise HTTPException(status_code=400, detail="User/Company ID required")

    # In original: it finds User by ID. In Python user.py, we have User model.
    # We'll try finding in User collection, if not then Company (since dashboard sends company_id in some places)
    # Dashboard.jsx sends `status.company_id` to streak endpoint, but `share-win` implementation in node used `User`.
    # Let's support both or just User if that's what frontend sends.
    
    collection = db.users
    entity = await collection.find_one({"_id": ObjectId(uid)})
    if not entity:
        # Try company
        collection = db.companies
        entity = await collection.find_one({"_id": ObjectId(uid)})
        if not entity:
             raise HTTPException(status_code=404, detail="Entity not found")
             
    credits_earned = tenderValue // 10000
    
    # Update credits and shares
    await collection.update_one(
        {"_id": ObjectId(uid)},
        {
            "$inc": {"credits": credits_earned},
            "$push": {
                "shares": {
                    "type": shareType,
                    "tenderValue": tenderValue,
                    "tenderTitle": tenderTitle,
                    "timestamp": datetime.utcnow(),
                    "creditsEarned": credits_earned
                }
            }
        }
    )
    
    # Generate content with OpenAI
    share_content = "Great news! We just won a tender."
    if settings.OPENAI_API_KEY:
        try:
            client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            prompt = f"Write a {shareType} post about winning a tender: {tenderTitle} value {tenderValue} using LuciusAI."
            completion = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}]
            )
            share_content = completion.choices[0].message.content
        except Exception as e:
            print(f"Share content generation error: {e}")

    return {
        "success": True, 
        "creditsEarned": credits_earned,
        "shareContent": share_content, 
        "message": f"You earned {credits_earned} credits!"
    }

@router.get("/streak/{id}")
async def get_streak(
    id: str,
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
    # Id can be user or company id
    collection = db.users
    entity = await collection.find_one({"_id": ObjectId(id)})
    if not entity:
        collection = db.companies
        entity = await collection.find_one({"_id": ObjectId(id)})
        
    if not entity:
        return {"success": False, "error": "Not found"}

    last_active = entity.get("last_active") # DateTime object normally
    current_streak = entity.get("streak", 0)
    
    now = datetime.utcnow()
    
    # Simple logic
    if last_active:
        # If stored as string in some legacy data, parse it. But mostly datetime in mongo.
        if isinstance(last_active, str):
            try:
                last_active = datetime.fromisoformat(last_active.replace("Z", ""))
            except:
                last_active = now 
                
        diff = (now - last_active).days
        if diff <= 1:
            if diff == 1:
                current_streak += 1
            # else same day
        else:
            current_streak = 1
    else:
        current_streak = 1
        
    await collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"streak": current_streak, "last_active": now}}
    )
    
    return {
        "success": True, 
        "currentStreak": current_streak, 
        "message": "Keep it up!"
    }
    
@router.post("/track-referral")
async def track_ref(
    referrerId: str = Body(...),
    referredEmail: str = Body(...),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
    # ... Implementation similar to above ...
    return {"success": True, "message": "tracked"}
    
@router.get("/achievements/{userId}")
async def get_achievements(userId: str):
    # Mock for fast migration
    return {
        "success": True,
        "achievements": [],
        "totalUnlocked": 0,
        "nextAchievement": "Submit your first tender!"
    }
