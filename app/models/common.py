from typing import Any
from pydantic import BaseModel, BeforeValidator
from typing_extensions import Annotated

# Helper to automatically convert MongoDB ObjectId to string
PyObjectId = Annotated[str, BeforeValidator(str)]

class MongoBaseModel(BaseModel):
    id: PyObjectId | None = Field(default=None, alias="_id")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "651a... (ObjectId)"
            }
        }
