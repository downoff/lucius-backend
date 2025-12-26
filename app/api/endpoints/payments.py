from fastapi import APIRouter, Depends, Body, HTTPException
from app.api import deps
from app.models.user import UserInDB
from app.services.payment_service import create_checkout_session, create_portal_session
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import stripe

router = APIRouter()

@router.post("/create-checkout-session")
async def checkout_session(
    price_id: str = Body(None, embed=True),
    current_user: UserInDB = Depends(deps.get_current_user),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
    """
    Create a Stripe checkout session with robust error handling.
    """
    try:
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
        
        # 2. Validate price_id (use provided or fallback to env)
        final_price_id = price_id
        
        # 3. Create checkout session (service handles validation and errors)
        session, cid = await create_checkout_session(company, final_price_id)
        
        # 4. Update customer ID if new
        if cid != company.get("stripe_customer_id"):
             await db.companies.update_one(
                 {"_id": company["_id"]}, 
                 {"$set": {"stripe_customer_id": cid}}
             )
             
        return {"url": session.url}
        
    except stripe.error.StripeError as e:
        # Stripe-specific errors
        error_message = getattr(e, 'user_message', f"Stripe API Error: {str(e)}")
        print(f"STRIPE API ERROR in checkout_session endpoint: {str(e)}")
        raise HTTPException(status_code=400, detail=error_message)
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Other errors (config, validation, etc.)
        error_detail = str(e)
        print(f"INTERNAL ERROR in checkout_session endpoint: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {error_detail}")

@router.post("/create-portal-session")
async def portal_session(
    company_id: str = Body(..., embed=True),
    current_user: UserInDB = Depends(deps.get_current_user),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
    """
    Create a Stripe billing portal session with robust error handling.
    """
    try:
        # Get company (use user's company_id if not provided, or validate access)
        user_company_id = current_user.company_id
        target_company_id = company_id or user_company_id
        
        if not target_company_id:
            raise HTTPException(status_code=404, detail="Company not found")
        
        company = await db.companies.find_one({"_id": ObjectId(target_company_id)})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Verify user has access to this company
        if str(company.get("owner_id")) != str(current_user.id) and current_user.id not in company.get("members", []):
            raise HTTPException(status_code=403, detail="Access denied to this company")
        
        portal = await create_portal_session(company)
        return {"url": portal.url}
        
    except stripe.error.StripeError as e:
        error_message = getattr(e, 'user_message', f"Stripe API Error: {str(e)}")
        print(f"STRIPE API ERROR in portal_session endpoint: {str(e)}")
        raise HTTPException(status_code=400, detail=error_message)
    except HTTPException:
        raise
    except Exception as e:
        error_detail = str(e)
        print(f"INTERNAL ERROR in portal_session endpoint: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {error_detail}")
