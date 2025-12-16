from fastapi import APIRouter, Depends, Body, HTTPException
from app.api import deps
from app.services.payment_service import create_checkout_session, create_portal_session
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

router = APIRouter()

@router.post("/create-checkout-session")
async def checkout_session(
    company_id: str = Body(..., embed=True),
    price_id: str = Body(None, embed=True),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
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
        print(e)
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
