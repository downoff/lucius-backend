from fastapi import APIRouter, Body
import random

router = APIRouter()

@router.post("/analyze")
async def analyze_bid(
    value: str = Body(None),
    complexity: str = Body("medium"),
    competitors: str = Body("3"),
):
    # Mock logic from frontend description to return a score
    # In real world, this would use the OpenAI service. 
    # For migration stability, we ensure it returns a valid structure.
    
    try:
        val_num = float(value) if value else 0
        comp_num = float(competitors) if competitors else 3
    except:
        val_num = 50000
        comp_num = 3
        
    # Simple heuristic
    base_score = 100
    if complexity == "high": base_score -= 20
    if comp_num > 5: base_score -= 20
    if val_num < 10000: base_score -= 10
    
    final_score = max(10, min(98, base_score - (comp_num * 2)))
    
    return {"score": final_score}
