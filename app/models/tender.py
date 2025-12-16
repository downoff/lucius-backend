from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.common import MongoBaseModel

class TenderBase(BaseModel):
    source: Optional[str] = None
    title: Optional[str] = None
    description_raw: Optional[str] = None
    authority: Optional[str] = None
    country: Optional[str] = None
    deadline_iso: Optional[str] = None
    cpv_codes: List[str] = []
    url: Optional[str] = None

class TenderInDB(TenderBase, MongoBaseModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
