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
    import os
    # Default to production URL if not set locally
    return os.getenv("FRONTEND_URL", "https://lucius-ai.onrender.com")

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
    
    base = await get_frontend_base()
    
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{base}/dashboard?checkout_success=true",
        cancel_url=f"{base}/pricing?checkout_canceled=true",
        client_reference_id=str(company["_id"]),
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
