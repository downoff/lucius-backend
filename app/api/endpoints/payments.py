from fastapi import APIRouter, Depends, Body, HTTPException
from fastapi.responses import JSONResponse
from app.api import deps
from app.models.user import UserInDB
from app.services.payment_service import create_checkout_session, create_portal_session
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import stripe
import os
import traceback
import uuid

router = APIRouter()

@router.post("/create-checkout-session")
async def checkout_session(
    price_id: str = Body(None, embed=True),
    current_user: UserInDB = Depends(deps.get_current_user),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
    """
    Create a Stripe checkout session with DEEP DEBUGGING for 500 errors.
    """
    try:
        print(f"PAYMENT CRASH: Starting checkout_session endpoint", flush=True)
        print("=" * 80)
        print("DEBUG: Starting checkout session creation...")
        print(f"DEBUG: User {current_user.email} (ID: {current_user.id}) initiating checkout.")
        print(f"DEBUG: Request price_id parameter: {price_id}")
        
        # 1. PRE-FLIGHT CHECKS - Load and validate all config
        print("\n--- PRE-FLIGHT CONFIG CHECK ---")
        
        # Load config from environment
        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        env_price_id = os.getenv("STRIPE_PRICE_ID") or os.getenv("STRIPE_PRICE_AGENCY")
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        
        # Also check settings (fallback)
        from app.core.config import settings
        if not stripe_key:
            stripe_key = settings.STRIPE_SECRET_KEY
        
        # DEFENSIVE CODING: Strip whitespace if keys exist
        if stripe_key:
            stripe_key = stripe_key.strip()
        else:
            print("CRITICAL: STRIPE_SECRET_KEY is missing!", flush=True)
        
        if frontend_url:
            frontend_url = frontend_url.strip().rstrip('/')  # Remove trailing slash too
        
        if not env_price_id:
            env_price_id = None  # Will use request param or fail
        
        # Determine final price_id
        final_price_id = price_id or env_price_id
        
        # DEBUG LOGGING (Check your Render Logs for these!)
        print(f"DEBUG: STRIPE_SECRET_KEY present: {bool(stripe_key)}")
        if stripe_key:
            # Print only first 4 chars to prove it loaded without leaking it
            print(f"DEBUG: STRIPE_SECRET_KEY preview: {stripe_key[:4]}...{stripe_key[-4:] if len(stripe_key) > 8 else '***'}")
        else:
            print("CRITICAL: STRIPE_SECRET_KEY is missing/empty!")
        
        print(f"DEBUG: STRIPE_PRICE_ID from env: {env_price_id}")
        print(f"DEBUG: Final price_id to use: {final_price_id}")
        print(f"DEBUG: FRONTEND_URL: {frontend_url}")
        
        # Validate critical config
        if not stripe_key:
            print("CRITICAL: STRIPE_SECRET_KEY is missing/empty!")
            raise HTTPException(status_code=500, detail="Server misconfiguration: No Stripe Key")
        
        if not final_price_id:
            print("CRITICAL: STRIPE_PRICE_ID is missing/empty and no price_id provided in request!")
            raise HTTPException(status_code=500, detail="Server misconfiguration: No Price ID")
        
        # 2. Get or Create Company for the user
        print("\n--- COMPANY SETUP ---")
        company_id = current_user.company_id
        print(f"DEBUG: User company_id: {company_id}")
        
        if not company_id:
            print("DEBUG: No company found, creating new company...")
            # AUTO-CREATE COMPANY "My Workspace"
            from app.models.company import CompanyInDB
            
            # Generate unique referral_code to prevent DuplicateKeyError
            referral_code = str(uuid.uuid4())[:8]
            print(f"DEBUG: Generated referral_code: {referral_code}", flush=True)
            
            company_data = CompanyInDB(
                company_name=f"{current_user.name or 'User'}'s Workspace",
                owner_id=current_user.id,
                members=[current_user.id],
                contact_email=current_user.email,
                referral_code=referral_code  # Always set to prevent null duplicate key error
            )
            
            try:
                comp_res = await db.companies.insert_one(company_data.model_dump())
            except Exception as db_error:
                # Handle potential duplicate key errors
                error_msg = str(db_error)
                print(f"PAYMENT CRASH: Database error creating company: {error_msg}", flush=True)
                print(f"PAYMENT CRASH: Error type: {type(db_error).__name__}", flush=True)
                if "duplicate key" in error_msg.lower() or "duplicatekeyerror" in error_msg.lower():
                    # Retry with a new referral_code
                    referral_code = str(uuid.uuid4())[:8]
                    print(f"DEBUG: Retrying with new referral_code: {referral_code}", flush=True)
                    company_data.referral_code = referral_code
                    comp_res = await db.companies.insert_one(company_data.model_dump())
                else:
                    raise
            company_id = comp_res.inserted_id
            print(f"DEBUG: Created new company with ID: {company_id}")
            
            # Link back to user
            await db.users.update_one(
                {"_id": current_user.id},
                {"$set": {"company_id": company_id}}
            )
            
            company = await db.companies.find_one({"_id": company_id})
        else:
            print(f"DEBUG: Loading existing company: {company_id}")
            company = await db.companies.find_one({"_id": ObjectId(company_id)})
            
        if not company:
            print("ERROR: Company not found after creation/lookup")
            raise HTTPException(status_code=404, detail="Company not found")
        
        print(f"DEBUG: Company loaded: {company.get('company_name')} (ID: {company['_id']})")
        
        # 3. CONFIGURE STRIPE
        print("\n--- STRIPE CONFIGURATION ---")
        
        # DEBUG: Print variables before Stripe calls
        print(f"Using Frontend URL: {frontend_url}", flush=True)
        print(f"Stripe Key exists: {bool(stripe_key)}", flush=True)
        print(f"Final price_id: {final_price_id}", flush=True)
        
        # DEFENSIVE CODING: Ensure key is stripped before setting
        stripe.api_key = stripe_key.strip() if stripe_key else None
        print("DEBUG: Stripe API key set", flush=True)
        
        # 4. CREATE CHECKOUT SESSION
        print("\n--- CREATING STRIPE SESSION ---")
        print(f"DEBUG: Calling create_checkout_session with price_id: {final_price_id}", flush=True)
        
        try:
            session, cid = await create_checkout_session(company, final_price_id)
        except Exception as service_error:
            # Catch errors from payment_service and re-raise with more context
            error_msg = str(service_error)
            print(f"PAYMENT CRASH: Error from payment_service: {error_msg}", flush=True)
            print(f"PAYMENT CRASH: Error type: {type(service_error).__name__}", flush=True)
            # traceback is already imported at top of file
            print(f"PAYMENT CRASH: Service stack trace:\n{traceback.format_exc()}", flush=True)
            # Re-raise to be caught by outer exception handler
            raise Exception(f"Payment service error: {error_msg}") from service_error
        
        print(f"DEBUG: Session created successfully: {session.id}")
        print(f"DEBUG: Session URL: {session.url}")
        print(f"DEBUG: Customer ID: {cid}")
        
        # 5. Update customer ID if new
        if cid != company.get("stripe_customer_id"):
            print(f"DEBUG: Updating company with new customer ID: {cid}")
            await db.companies.update_one(
                {"_id": company["_id"]}, 
                {"$set": {"stripe_customer_id": cid}}
            )
        
        print("SUCCESS: Checkout session created successfully")
        print("=" * 80)
        return {"url": session.url}
        
    except stripe.error.AuthenticationError as e:
        error_msg = str(e)
        print(f"\n{'=' * 80}", flush=True)
        print(f"PAYMENT CRASH: STRIPE AUTHENTICATION ERROR: {error_msg}", flush=True)
        print(f"ERROR TYPE: {type(e).__name__}", flush=True)
        print(f"{'=' * 80}", flush=True)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Invalid Stripe API Key: {error_msg}"}
        )
        
    except stripe.error.InvalidRequestError as e:
        error_msg = str(e)
        error_code = getattr(e, 'code', 'N/A')
        error_param = getattr(e, 'param', 'N/A')
        print(f"\n{'=' * 80}", flush=True)
        print(f"PAYMENT CRASH: STRIPE INVALID REQUEST ERROR: {error_msg}", flush=True)
        print(f"ERROR TYPE: {type(e).__name__}", flush=True)
        print(f"ERROR CODE: {error_code}", flush=True)
        print(f"ERROR PARAM: {error_param}", flush=True)
        print(f"{'=' * 80}", flush=True)
        error_message = getattr(e, 'user_message', error_msg)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Stripe rejected request: {error_message}"}
        )
        
    except stripe.error.StripeError as e:
        error_msg = str(e)
        error_code = getattr(e, 'code', 'N/A')
        print(f"\n{'=' * 80}", flush=True)
        print(f"PAYMENT CRASH: STRIPE API ERROR: {error_msg}", flush=True)
        print(f"ERROR TYPE: {type(e).__name__}", flush=True)
        print(f"ERROR CODE: {error_code}", flush=True)
        print(f"{'=' * 80}", flush=True)
        error_message = getattr(e, 'user_message', f"Stripe API Error: {error_msg}")
        return JSONResponse(
            status_code=500,
            content={"detail": error_message}
        )
        
    except HTTPException as e:
        # Re-raise HTTP exceptions as-is (these are intentional errors)
        print(f"PAYMENT CRASH: HTTPException raised: {e.status_code} - {e.detail}", flush=True)
        raise
        
    except Exception as e:
        # This is the most important line - print full stack trace
        error_msg = str(e)
        error_type = type(e).__name__
        stack_trace = traceback.format_exc()
        
        print(f"\n{'=' * 80}", flush=True)
        print(f"PAYMENT CRASH: {error_msg}", flush=True)
        print(f"ERROR TYPE: {error_type}", flush=True)
        print("\nFULL STACK TRACE:", flush=True)
        print(stack_trace, flush=True)
        print(f"{'=' * 80}", flush=True)
        
        # Return JSON response so error is visible in frontend Network tab
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"Payment Error: {error_msg}",
                "error_type": error_type,
                "stack_trace": stack_trace
            }
        )

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
