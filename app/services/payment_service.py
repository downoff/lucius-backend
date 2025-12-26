import stripe
import os
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
    # Get Base URL (Handle Localhost vs Production automatically)
    return os.getenv("FRONTEND_URL", settings.FRONTEND_URL or "http://localhost:5173")

async def create_checkout_session(company: dict, price_id: str):
    """
    Create a Stripe checkout session with robust error handling.
    """
    try:
        # CRITICAL: Explicitly set API key (in case it wasn't set at module load)
        stripe_secret_key = os.getenv("STRIPE_SECRET_KEY") or settings.STRIPE_SECRET_KEY
        if not stripe_secret_key:
            raise Exception("Server config error: STRIPE_SECRET_KEY is missing")
        
        stripe.api_key = stripe_secret_key
        
        # Validate price_id (Fail fast if missing or invalid)
        if not price_id or price_id == "price_default":
            # Try to get from environment
            price_id = os.getenv("STRIPE_PRICE_ID") or os.getenv("STRIPE_PRICE_AGENCY")
            if not price_id:
                raise Exception("Server config error: STRIPE_PRICE_ID is missing. Please provide price_id in request or set STRIPE_PRICE_ID environment variable")
        
        # Get or create customer
        customer_id = company.get("stripe_customer_id")
        if not customer_id:
            # Create customer
            customer_email = company.get("contact_email") or (company.get("contact_emails", [""])[0] if company.get("contact_emails") else None)
            customer = stripe.Customer.create(
                name=company.get("company_name", "Lucius Customer"),
                email=customer_email,
                metadata={"company_id": str(company["_id"])}
            )
            customer_id = customer.id
        
        # Get frontend base URL
        base = await get_frontend_base()
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            mode='subscription',  # Change to 'payment' if it's a one-time fee
            customer=customer_id,
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            success_url=f"{base}/settings?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base}/settings?canceled=true",
            client_reference_id=str(company["_id"]),  # Pass company ID to track who bought it
            metadata={
                "company_id": str(company["_id"]),
                "user_email": company.get("contact_email") or (company.get("contact_emails", [""])[0] if company.get("contact_emails") else "")
            }
        )
        
        return session, customer_id
        
    except stripe.error.StripeError as e:
        # Stripe-specific errors
        error_message = getattr(e, 'user_message', str(e))
        print(f"STRIPE API ERROR: {str(e)}")  # Print to Render logs
        raise Exception(f"Stripe Error: {error_message}")
    except Exception as e:
        # Other errors (config, validation, etc.)
        print(f"INTERNAL ERROR in create_checkout_session: {str(e)}")  # Print specific crash reason
        raise Exception(f"Internal Server Error: {str(e)}")

async def create_portal_session(company: dict):
    """
    Create a Stripe billing portal session with robust error handling.
    """
    try:
        # CRITICAL: Explicitly set API key
        stripe_secret_key = os.getenv("STRIPE_SECRET_KEY") or settings.STRIPE_SECRET_KEY
        if not stripe_secret_key:
            raise Exception("Server config error: STRIPE_SECRET_KEY is missing")
        
        stripe.api_key = stripe_secret_key

        customer_id = company.get("stripe_customer_id")
        if not customer_id:
            raise Exception("No Stripe customer found for this company")

        base = await get_frontend_base()
        
        portal = stripe.billingPortal.Session.create(
            customer=customer_id,
            return_url=f"{base}/settings"
        )
        return portal
        
    except stripe.error.StripeError as e:
        error_message = getattr(e, 'user_message', str(e))
        print(f"STRIPE API ERROR in create_portal_session: {str(e)}")
        raise Exception(f"Stripe Error: {error_message}")
    except Exception as e:
        print(f"INTERNAL ERROR in create_portal_session: {str(e)}")
        raise Exception(f"Internal Server Error: {str(e)}")
