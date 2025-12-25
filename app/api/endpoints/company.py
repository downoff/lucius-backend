from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.api import deps
from app.models.company import CompanyInDB
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter()

@router.get("/status")
async def get_company_status(
    current_user: Any = Depends(deps.get_current_user), 
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    # Find company where user is owner or member
    # Checking both company_id link on user and owner_id link on company for robustness
    
    company = None
    
    # 1. Try via user.company_id if exists
    if current_user.company_id:
        company = await db.companies.find_one({"_id": current_user.company_id})
    
    # 2. Try finding by owner_id if not found yet
    if not company:
        company = await db.companies.find_one({"owner_id": current_user.id}) # UserInDB id matches _id
        
    # 3. Fallback for demo context: if user is specific demo email, return demo company?
    # For now, just return None/status if not found
    
    if not company:
        return {"status": "no_company", "user_id": str(current_user.id)}
    
    # helper
    company["_id"] = str(company["_id"])
    return company

@router.post("/")
async def create_company(
    company_in: Dict[str, Any],
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    # Basic create
    res = await db.companies.insert_one(company_in)
    return {"id": str(res.inserted_id), "status": "created"}

@router.patch("/")
async def update_company(
    company_in: Dict[str, Any],
    current_user: Any = Depends(deps.get_current_user),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    """
    Update the current user's company.
    """
    # 1. Resolve company
    company_id = current_user.company_id
    if not company_id:
        # try owner
        company = await db.companies.find_one({"owner_id": current_user.id})
        if company:
            company_id = company["_id"]
    
    if not company_id:
         raise HTTPException(status_code=404, detail="No company found for this user")

    # 2. Filter updateable fields to prevent overwriting critical stuff like 'is_paid' easily if not careful
    # For now, we trust the Dict but ideally use a Pydantic schema
    allowed_fields = [
        "company_name", "website", "contact_emails", "industry", 
        "team_size", "tender_volume", "countries", "cpv_codes"
    ]
    
    update_data = {k: v for k, v in company_in.items() if k in allowed_fields}
    
    if not update_data:
        return {"msg": "No valid fields to update"}
        
    update_data["updated_at"] = deps.datetime.utcnow()

    await db.companies.update_one(
        {"_id": company_id},
        {"$set": update_data}
    )
    
    return {"msg": "Company updated successfully"}
