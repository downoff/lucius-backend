from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from app.api import deps
from app.models.schemas import TenderResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

router = APIRouter()

@router.get("/matching", response_model=List[TenderResponse])
async def read_matching_tenders(
    region: Optional[str] = Query(None),
    min_score: int = Query(0),
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    """
    Retrieve matching tenders with filters.
    """
    query: dict = {}
    
    # Region filtering:
    # Frontend sends IDs like "UK", "DACH", "FR", "Nordics", "US", etc.
    # Our data might have "UK", "United Kingdom", "Germany", etc.
    # We'll implement basic mapping or regex for broader matching.
    if region:
        if region == "UK":
            query["$or"] = [{"country": "UK"}, {"region": "UK"}, {"country": "United Kingdom"}]
        elif region == "US":
             query["country"] = "United States"
        elif region == "DACH":
             query["country"] = {"$in": ["Germany", "Austria", "Switzerland"]}
        elif region == "Nordics":
             query["country"] = {"$in": ["Sweden", "Norway", "Denmark", "Finland"]}
        else:
             query["$or"] = [{"country": region}, {"region": region}]

    if min_score > 0:
        query["match_score"] = {"$gte": min_score}

    # Debug log
    # print(f"Querying matching tenders: {query}")

    cursor = db.tenders.find(query).sort("match_score", -1).limit(100)
    tenders = await cursor.to_list(length=100)
    
    # Transform _id to string for Pydantic using the alias
    results = []
    for t in tenders:
        t["_id"] = str(t["_id"])
        # Ensure date fields are present if needed by frontend
        results.append(t)
        
    return results

@router.get("/{id}", response_model=TenderResponse)
async def read_tender(
    id: str,
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    """
    Get tender by ID.
    """
    tender = None
    if ObjectId.is_valid(id):
        tender = await db.tenders.find_one({"_id": ObjectId(id)})
    
    if not tender:
        # Try legacy string ID or field 'id'
        tender = await db.tenders.find_one({"id": id})

    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    tender["_id"] = str(tender["_id"])
    return tender
