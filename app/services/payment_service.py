import stripe
from typing import Optional
from app.core.config import settings
from app.api import deps
from app.models.company import CompanyInDB
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

# Initialize Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY

async def get_frontend_base():
    # Helper to get frontend URL from config/env
    # In a real app this might be stricter
    return "http://localhost:5173"

async def create_checkout_session(company: dict, price_id: str):
    if not settings.STRIPE_SECRET_KEY:
         raise Exception("Stripe not configured")

    customer_id = company.get("stripe_customer_id")
    if not customer_id:
        # Create customer
        customer = stripe.Customer.create(
            name=company.get("company_name", "Lucius Customer"),
            email=company.get("contact_emails", [""])[0],
            metadata={"company_id": str(company["_id"])}
        )
        customer_id = customer.id
        # We need to update user in DB here or outside. 
        # This function returns session, let caller update DB if needed or do it here.
        # For refined architecture, caller should handle DB updates, but we'll return customer_id
    
    base = await get_frontend_base()
    
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{base}/success",
        cancel_url=f"{base}/cancel",
        metadata={"company_id": str(company["_id"])}
    )
    
    return session, customer_id

async def create_portal_session(company: dict):
    if not settings.STRIPE_SECRET_KEY:
         raise Exception("Stripe not configured")

    if not company.get("stripe_customer_id"):
        raise Exception("No Stripe customer found")

    base = await get_frontend_base()
    
    portal = stripe.billingPortal.Session.create(
        customer=company.get("stripe_customer_id"),
        return_url=f"{base}/pricing"
    )
    return portal
