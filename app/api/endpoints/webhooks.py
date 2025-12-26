import stripe
from typing import Any
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from app.core.config import settings
from app.api import deps
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

router = APIRouter()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    """
    Handle Stripe Webhooks (Async Payment Confirmation)
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Stripe Webhook Secret not configured")

    payload = await request.body()
    event = None
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        await handle_checkout_completed(session, db)

    return {"status": "success"}

async def handle_checkout_completed(session: dict, db: AsyncIOMotorDatabase):
    """
    Fulfill the purchase: Mark company as paid.
    """
    customer_email = session.get('customer_details', {}).get('email')
    customer_id = session.get('customer')
    
    # We should have passed client_reference_id as company_id or user_id
    # But current payments.py logic (if not updated) might not pass it.
    # Let's rely on finding by email if reference is missing, 
    # OR we need to update payments.py to pass client_reference_id.
    
    # Ideally, payments.py sets client_reference_id to company_id
    client_ref = session.get('client_reference_id')
    
    company = None
    if client_ref:
        company = await db.companies.find_one({"_id": ObjectId(client_ref)})
    
    if not company and customer_email:
        # Fallback: Find user by email, then their company
        user = await db.users.find_one({"email": customer_email})
        if user and user.get("company_id"):
             company = await db.companies.find_one({"_id": user["company_id"]})
    
    if company:
        await db.companies.update_one(
            {"_id": company["_id"]},
            {"$set": {
                "is_paid": True, 
                "stripe_customer_id": customer_id,
                "plan": "agency", # Assuming 'agency' is the pro plan
                "updated_at":  session.get('created') # unix timestamp ok? better datetime normally
            }}
        )
        print(f"💰 [WEBHOOK] Upgrade Successful for: {company.get('company_name')}")
    else:
        print(f"⚠️ [WEBHOOK] Could not find company for email: {customer_email}")
