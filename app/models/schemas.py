from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class TenderResponse(BaseModel):
    model_config = ConfigDict(extra='ignore', populate_by_name=True)
    
    id: str = Field(alias="_id")
    title: str
    description_raw: Optional[str] = None
    short_description: Optional[str] = None
    source: Optional[str] = None
    authority: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    deadline_iso: Optional[str] = None
    deadline: Optional[datetime] = None 
    budget: Optional[str] = None
    match_score: int = 0
    rationale: Optional[str] = None
    published_at: Optional[datetime] = None
    url: Optional[str] = None
    source_url: Optional[str] = None
    is_stub: bool = False
    
    # AI Fields
    ai_summary: Optional[str] = None
    compliance_matrix: Optional[List[dict]] = None
    compliance_constraints: Optional[List[dict]] = None # Alias/Alternate
