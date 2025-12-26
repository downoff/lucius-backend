from fastapi import APIRouter, Depends, HTTPException
from app.api import deps
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.get("/streak/{user_id}")
async def get_streak(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
    """
    Get or update user streak for daily engagement tracking.
    Matches frontend expectation: GET /api/growth/streak/<user_id>
    """
    try:
        print(f"DEBUG: Streak endpoint called for user_id: {user_id}")
        
        # Find user by ID
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception as e:
            print(f"ERROR: Invalid user_id format: {user_id}, error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid user ID format: {str(e)}")
        
        if not user:
            print(f"ERROR: User not found: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        print(f"DEBUG: User found: {user.get('email', 'N/A')}")
        
        # Get current date (UTC)
        today = datetime.utcnow().date()
        
        # Get last active date from user
        last_active = user.get("last_active")
        if last_active:
            if isinstance(last_active, str):
                try:
                    last_active = datetime.fromisoformat(last_active.replace('Z', '+00:00'))
                except:
                    last_active = datetime.utcnow()
            elif not isinstance(last_active, datetime):
                last_active = datetime.utcnow()
            last_active_date = last_active.date() if hasattr(last_active, 'date') else last_active
        else:
            last_active_date = None
        
        # Calculate streak
        current_streak = user.get("streak", 0)
        
        if last_active_date:
            days_diff = (today - last_active_date).days
            
            if days_diff == 0:
                # Same day, maintain streak
                print(f"DEBUG: Same day, maintaining streak: {current_streak}")
            elif days_diff == 1:
                # Consecutive day, increment streak
                current_streak += 1
                print(f"DEBUG: Consecutive day, incrementing streak to: {current_streak}")
            else:
                # Broke streak, reset to 1
                current_streak = 1
                print(f"DEBUG: Streak broken ({days_diff} days), resetting to 1")
        else:
            # First time, start streak at 1
            current_streak = 1
            print(f"DEBUG: First time tracking, starting streak at 1")
        
        # Update user with new streak and last_active
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "streak": current_streak,
                    "last_active": datetime.utcnow()
                }
            }
        )
        
        # Generate message
        if current_streak > 7:
            message = "You're on fire! 🔥"
        elif current_streak >= 7:
            message = "1 week streak! Keep it going! 🎉"
        else:
            message = "Keep the streak going!"
        
        print(f"DEBUG: Returning streak: {current_streak}")
        
        return {
            "success": True,
            "currentStreak": current_streak,
            "message": message,
            "rewardUnlocked": current_streak == 7 if current_streak == 7 else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in get_streak: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to track streak: {str(e)}")

