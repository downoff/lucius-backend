from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import db

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for debugging/demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router imports
# Router imports
from app.api.endpoints import auth, users, tenders, company, ai_tender, payments, viral, scoring, dashboard

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tenders.router, prefix="/api/tenders", tags=["tenders"])
app.include_router(company.router, prefix="/api/company", tags=["company"])
app.include_router(ai_tender.router, prefix="/api/ai-tender", tags=["ai-tender"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(viral.router, prefix="/api/viral", tags=["viral"])
app.include_router(scoring.router, prefix="/api/scoring", tags=["scoring"])
app.include_router(dashboard.router, prefix="/api/admin", tags=["admin"])

@app.on_event("startup")
async def startup_db_client():
    db.connect()
    
    try:
        # ensure demo user exists
        from app.core.security import get_password_hash
        from app.models.user import UserInDB
        
        email = "demo@ycombinator.com"
        pwd = "trylucius2026"
        hashed = get_password_hash(pwd)
        
        existing = await db.db.users.find_one({"email": email})
        if existing:
            await db.db.users.update_one(
                {"email": email},
                {"$set": {"password": hashed, "isPro": True, "credits": 100, "name": "YC Demo"}}
            )
            print(f"Verified/Reset Demo User: {email}")
        else:
            user_in = UserInDB(
                email=email,
                password=hashed,
                name="YC Demo",
                isPro=True,
                credits=100
            ) 
            user_dict = user_in.model_dump()
            user_dict["password"] = hashed # ensure hash
            await db.db.users.insert_one(user_dict)
            print(f"Created Demo User: {email}")
            
    except BaseException as e:
        import traceback
        traceback.print_exc()
        print(f"Error checking demo user (Non-critical): {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    db.close()

@app.get("/health")
async def health_check():
    return {"status": "ok", "backend": "python-fastapi"}

@app.get("/")
async def root():
    return {"message": "Welcome to LuciusAI Python Backend"}
