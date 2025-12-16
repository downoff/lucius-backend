from app.models.user import UserInDB
from bson import ObjectId
from datetime import datetime
import traceback

def test_model():
    print("Testing UserInDB instantiation...")
    
    # Matches setup_yc_demo.py
    user_data = {
        "_id": ObjectId(),
        "email": "demo@ycombinator.com",
        "password": "hashed_secret",
        "full_name": "Gary Tan",
        "is_active": True,
        "is_superuser": False,
        "created_at": datetime.utcnow(),
        "credits": 500,
        "onboarding_completed": True
    }
    
    try:
        u = UserInDB(**user_data)
        print("Success:", u)
    except Exception:
        traceback.print_exc()

if __name__ == "__main__":
    test_model()
