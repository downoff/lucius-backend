from fastapi import APIRouter, Depends, Body, HTTPException
from app.api import deps
from app.models.user import UserInDB
from app.services.payment_service import create_checkout_session, create_portal_session
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

router = APIRouter()

@router.post("/create-checkout-session")
async def checkout_session(
    price_id: str = Body(None, embed=True),
    current_user: UserInDB = Depends(deps.get_current_user),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
    # 1. Get or Create Company for the user
    company_id = current_user.company_id
    
    if not company_id:
        # AUTO-CREATE COMPANY "My Workspace"
        from app.models.company import CompanyInDB
        
        company_data = CompanyInDB(
            company_name=f"{current_user.name or 'User'}'s Workspace",
            owner_id=current_user.id,
            members=[current_user.id],
            contact_email=current_user.email
        )
        
        comp_res = await db.companies.insert_one(company_data.model_dump())
        company_id = comp_res.inserted_id
        
        # Link back to user
        await db.users.update_one(
            {"_id": current_user.id},
            {"$set": {"company_id": company_id}}
        )
        
        company = await db.companies.find_one({"_id": company_id})
    else:
        company = await db.companies.find_one({"_id": ObjectId(company_id)})
        
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    try:
        session, cid = await create_checkout_session(company, price_id or "price_default")
        
        # Update customer ID if new
        if cid != company.get("stripe_customer_id"):
             await db.companies.update_one(
                 {"_id": company["_id"]}, 
                 {"$set": {"stripe_customer_id": cid}}
             )
             
        return {"url": session.url}
    except Exception as e:
        print(f"Checkout Error: {e}")
        raise HTTPException(status_code=500, detail="Checkout error")

@router.post("/create-portal-session")
async def portal_session(
    company_id: str = Body(..., embed=True),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
    company = await db.companies.find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    try:
        portal = await create_portal_session(company)
        return {"url": portal.url}
    except Exception as e:
         raise HTTPException(status_code=500, detail="Portal error")
