import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from datetime import datetime
import os
from dotenv import load_dotenv
from bson import ObjectId

# Load Env
load_dotenv()

# Setup Security
# pwd_context removed

def get_password_hash(password):
    # Generating a salt and hashing the password
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

async def seed_yc_demo():
    # Connect
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/lucius-ai")
    client = AsyncIOMotorClient(mongo_uri)
    db = client.get_database() # Uses default from URI
    
    print(f"Connected to {mongo_uri}")

    # 1. Create User
    email = "demo@ycombinator.com"
    password = "trylucius2026"
    hashed = get_password_hash(password)
    
    user_data = {
        "email": email,
        "password": hashed,
        "full_name": "Gary Tan",
        "is_active": True,
        "is_superuser": False,
        "created_at": datetime.utcnow(),
        "credits": 500,
        "onboarding_completed": True
    }
    
    # Upsert User
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        await db.users.update_one({"email": email}, {"$set": user_data})
        user_id = existing_user["_id"]
        print(f"Updated User: {user_id}")
    else:
        result = await db.users.insert_one(user_data)
        user_id = result.inserted_id
        print(f"Created User: {user_id}")

    # 2. Create Company
    company_data = {
        "user_id": str(user_id), # Link to user
        "company_name": "Lucius Demo Corp",
        "description": "We build high-performance AI infrastructure for the public sector.",
        "website": "https://ycombinator.com",
        "employees": "11-50",
        "countries": ["UK", "US", "EU"],
        "cpv_codes": ["72000000", "48000000"],
        "keywords_include": ["AI", "Cloud", "SaaS", "Digital Transformation"],
        "keywords_exclude": ["Construction", "Cleaning"],
        "plan": "enterprise", # Unlock everything
        "stripe_customer_id": "cus_demo_yc_123", # Mock
        "is_paid": True,
        "proposals_count": 5,
        "active": True
    }
    
    # Upsert Company
    # Try to find by user_id first to avoid dupes
    existing_company = await db.companies.find_one({"user_id": str(user_id)})
    if existing_company:
        await db.companies.update_one({"_id": existing_company["_id"]}, {"$set": company_data})
        company_id = existing_company["_id"]
        print(f"Updated Company: {company_id}")
    else:
        result = await db.companies.insert_one(company_data)
        company_id = result.inserted_id
        print(f"Created Company: {company_id}")
        
    # Link company back to user if needed (some legacy logic might look for it)
    await db.users.update_one({"_id": user_id}, {"$set": {"company_id": str(company_id)}})

    # 3. Create Dummy Tender (Active)
    tender_data = {
        "title": "Provision of Generative AI Services for Government Digital Service",
        "description_raw": """
        The Cabinet Office is seeking a partner to implement a secure, scalable Generative AI platform 
        to assist civil servants with drafting policy documents and summarizing consultation responses.
        
        Requirements:
        - Must support LLM generic models (GPT-4, Claude, etc.)
        - secure hosting within UK sovereign cloud
        - SOC2 compliance
        - Integration with existing Gov.uk Notify systems
        
        Budget: £2,000,000 - £5,000,000
        Duration: 24 months
        """,
        "authority": "Cabinet Office",
        "country": "UK",
        "region": "UK",
        "deadline": datetime(2026, 5, 20), # Future date
        "published_at": datetime.utcnow(),
        "cpv_codes": ["72000000"],
        "match_score": 98,
        "rationale": "Perfect match for your AI infrastructure capabilities and UK focus.",
        "status": "active",
        "url": "https://www.contractsfinder.service.gov.uk/notice/mock-yc-demo"
    }
    
    # Check if exists by title
    existing_tender = await db.tenders.find_one({"title": tender_data["title"]})
    if not existing_tender:
        res = await db.tenders.insert_one(tender_data)
        tender_id = res.inserted_id
        print(f"Created Dummy Tender: {tender_id}")
        
        # 3b. Create a 'Submission' or 'Draft' artifact if the app supports it
        # Based on my earlier scan, there isn't a strict 'Proposal' collection actively used 
        # but let's create a 'tender_submissions' entry just in case the legacy code uses it for the dashboard stats
        
        submission_data = {
            "userId": str(user_id),
            "companyId": str(company_id),
            "tenderId": str(tender_id),
            "tenderTitle": tender_data["title"],
            "status": "draft",
            "value_won": 0,
            "createdAt": datetime.utcnow(),
            "ai_draft_content": "# Executive Summary\n\nLucius Demo Corp is uniquely positioned..."
        }
        await db.tender_submissions.insert_one(submission_data)
        print("Created Dummy Submission Draft")

    print("\n--- YC DEMO SETUP COMPLETE ---")
    print(f"Login: {email}")
    print(f"Pass:  {password}")

if __name__ == "__main__":
    asyncio.run(seed_yc_demo())
