from typing import Any
from fastapi import APIRouter, Depends
from app.api import deps
from app.models.user import UserInDB

router = APIRouter()

@router.get("/me", response_model=UserInDB)
async def read_user_me(
    current_user: UserInDB = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user
