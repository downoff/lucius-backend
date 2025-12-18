from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import db

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://www.ailucius.com",
    "https://ailucius.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router imports
from app.api.endpoints import auth, users, tenders, company, ai_tender, payments, viral, scoring

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tenders.router, prefix="/api/tenders", tags=["tenders"])
app.include_router(company.router, prefix="/api/company", tags=["company"])
app.include_router(ai_tender.router, prefix="/api/ai-tender", tags=["ai-tender"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(viral.router, prefix="/api/viral", tags=["viral"])
app.include_router(scoring.router, prefix="/api/scoring", tags=["scoring"])

@app.on_event("startup")
async def startup_db_client():
    db.connect()
    
    # ensure demo user exists
    from app.core.security import get_password_hash
    from app.models.user import UserInDB
    
    try:
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
                password=hashed, # will be double hashed if passed to constructor? No, UserInDB is just a model.
                name="YC Demo",
                isPro=True,
                credits=100
            ) 
            user_dict = user_in.model_dump()
            user_dict["password"] = hashed # ensure hash
            await db.db.users.insert_one(user_dict)
            print(f"Created Demo User: {email}")
            
    except Exception as e:
        print(f"Error checking demo user: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    db.close()

@app.get("/health")
async def health_check():
    return {"status": "ok", "backend": "python-fastapi"}

@app.get("/")
async def root():
    return {"message": "Welcome to LuciusAI Python Backend"}
