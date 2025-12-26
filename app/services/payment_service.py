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
    frontend_url = os.getenv("FRONTEND_URL", settings.FRONTEND_URL or "http://localhost:5173")
    # DEFENSIVE CODING: Strip whitespace and remove trailing slash
    if frontend_url:
        frontend_url = frontend_url.strip().rstrip('/')
    return frontend_url

async def create_checkout_session(company: dict, price_id: str):
    """
    Create a Stripe checkout session with robust error handling and deep debugging.
    """
    import traceback
    
    try:
        print("DEBUG [payment_service]: Starting create_checkout_session")
        print(f"DEBUG [payment_service]: Company ID: {company.get('_id')}")
        print(f"DEBUG [payment_service]: Price ID received: {price_id}")
        
        # CRITICAL: Explicitly set API key (in case it wasn't set at module load)
        stripe_secret_key = os.getenv("STRIPE_SECRET_KEY") or settings.STRIPE_SECRET_KEY
        if not stripe_secret_key:
            print("CRITICAL [payment_service]: STRIPE_SECRET_KEY is missing!")
            raise Exception("Server config error: STRIPE_SECRET_KEY is missing")
        
        # DEFENSIVE CODING: Strip whitespace from key
        stripe_secret_key = stripe_secret_key.strip()
        
        print(f"DEBUG [payment_service]: Stripe key loaded (preview: {stripe_secret_key[:4]}...)")
        stripe.api_key = stripe_secret_key
        
        # Validate price_id (Fail fast if missing or invalid)
        if not price_id or price_id == "price_default":
            print("DEBUG [payment_service]: Price ID missing or default, checking env vars...")
            # Try to get from environment
            price_id = os.getenv("STRIPE_PRICE_ID") or os.getenv("STRIPE_PRICE_AGENCY")
            if not price_id:
                print("CRITICAL [payment_service]: No price_id found in env vars!")
                raise Exception("Server config error: STRIPE_PRICE_ID is missing. Please provide price_id in request or set STRIPE_PRICE_ID environment variable")
        
        print(f"DEBUG [payment_service]: Using price_id: {price_id}")
        
        # Get or create customer
        customer_id = company.get("stripe_customer_id")
        if not customer_id:
            print("DEBUG [payment_service]: No existing customer, creating new Stripe customer...")
            # Create customer
            customer_email = company.get("contact_email") or (company.get("contact_emails", [""])[0] if company.get("contact_emails") else None)
            print(f"DEBUG [payment_service]: Creating customer with email: {customer_email}")
            
            customer = stripe.Customer.create(
                name=company.get("company_name", "Lucius Customer"),
                email=customer_email,
                metadata={"company_id": str(company["_id"])}
            )
            customer_id = customer.id
            print(f"DEBUG [payment_service]: Created customer: {customer_id}")
        else:
            print(f"DEBUG [payment_service]: Using existing customer: {customer_id}")
        
        # Get frontend base URL
        base = await get_frontend_base()
        print(f"DEBUG [payment_service]: Frontend URL: {base}")
        
        # Create checkout session
        print("DEBUG [payment_service]: Creating Stripe checkout session...")
        print(f"DEBUG [payment_service]: Session params - price: {price_id}, customer: {customer_id}, mode: subscription")
        
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
        
        print(f"SUCCESS [payment_service]: Created session {session.id} with URL: {session.url}")
        return session, customer_id
        
    except stripe.error.AuthenticationError as e:
        print(f"STRIPE AUTHENTICATION ERROR [payment_service]: {str(e)}")
        error_message = getattr(e, 'user_message', str(e))
        raise Exception(f"Stripe Authentication Error: {error_message}")
        
    except stripe.error.InvalidRequestError as e:
        print(f"STRIPE INVALID REQUEST ERROR [payment_service]: {str(e)}")
        print(f"ERROR CODE: {getattr(e, 'code', 'N/A')}")
        print(f"ERROR PARAM: {getattr(e, 'param', 'N/A')}")
        error_message = getattr(e, 'user_message', str(e))
        raise Exception(f"Stripe Invalid Request: {error_message}")
        
    except stripe.error.StripeError as e:
        # Stripe-specific errors
        print(f"STRIPE API ERROR [payment_service]: {str(e)}")
        print(f"ERROR TYPE: {type(e).__name__}")
        error_message = getattr(e, 'user_message', str(e))
        raise Exception(f"Stripe Error: {error_message}")
        
    except Exception as e:
        # Other errors (config, validation, etc.)
        print(f"INTERNAL ERROR [payment_service]: {str(e)}")
        print(f"ERROR TYPE: {type(e).__name__}")
        print("FULL STACK TRACE:")
        print(traceback.format_exc())
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
        
        # DEFENSIVE CODING: Strip whitespace from key
        stripe_secret_key = stripe_secret_key.strip()
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
