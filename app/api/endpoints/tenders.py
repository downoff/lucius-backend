from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from app.api import deps
from app.models.schemas import TenderResponse
from app.models.tender import TenderCreate, TenderInDB
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.models.user import User
from fastapi import UploadFile, File
import io
from pypdf import PdfReader
from datetime import datetime, timezone

router = APIRouter()

router = APIRouter()

@router.post("/upload", response_model=TenderResponse)
async def upload_tender(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Upload a PDF tender, extract requirements via Gemini, and save to DB.
    """
    try:
        contents = await file.read()
        
        # Extract Text
        pdf_file = io.BytesIO(contents)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
            
        # AI Extraction
        from app.services.ai_service import extract_tender_data_from_text
        extracted_data = await extract_tender_data_from_text(text)
        
        # Create Tender Object
        tender_in = TenderInDB(
            title=extracted_data.get("title", file.filename),
            description_raw=extracted_data.get("description", "Uploaded PDF"),
            region=extracted_data.get("region", "Global"),
            budget=extracted_data.get("budget", "Unknown"),
            deadline_iso=extracted_data.get("deadline", "Unknown"),
            compliance_matrix=extracted_data.get("compliance_constraints", []),
            created_at=datetime.now(timezone.utc),
            source="upload",
            source_id="upload_" + file.filename,
            ai_summary=extracted_data.get("description"),
            match_score=95,
            country=extracted_data.get("region", "Global")
        )
        
        tender_dict = tender_in.model_dump()
        result = await db.tenders.insert_one(tender_dict)
        new_tender = await db.tenders.find_one({"_id": result.inserted_id})
        new_tender["_id"] = str(new_tender["_id"])
        
        return new_tender

    except Exception as e:
        print(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[TenderResponse])
async def read_tenders(
    skip: int = 0,
    limit: int = 100,
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
) -> Any:
    """
    Retrieve all tenders.
    """
    tenders = await db.tenders.find().skip(skip).limit(limit).to_list(100)
    # Transform _id
    for t in tenders:
        t["_id"] = str(t["_id"])
    return tenders

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
    try:
        tender = None
        if ObjectId.is_valid(id):
            tender = await db.tenders.find_one({"_id": ObjectId(id)})
        
        if not tender:
            # Try legacy string ID or field 'id'
            tender = await db.tenders.find_one({"id": id})

        if not tender:
            raise HTTPException(status_code=404, detail="Tender not found")
            
        tender["_id"] = str(tender["_id"])
        
        # Ensure compliance fields exist if missing
        if "compliance_matrix" not in tender:
            tender["compliance_matrix"] = []
            
        return tender
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error reading tender {id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
