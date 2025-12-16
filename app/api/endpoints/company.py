from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.api import deps
from app.models.company import CompanyInDB
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter()

@router.get("/status")
async def get_company_status(
    # current_user: UserInDB = Depends(deps.get_current_user), # Uncomment to secure
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    # return demo company or finding by user
    # For migration simplicity, return a mock or the first company found
    company = await db.companies.find_one({})
    if not company:
        return {"status": "no_company"}
    
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
