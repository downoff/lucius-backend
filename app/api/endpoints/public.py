from typing import Any
from fastapi import APIRouter, Body
from pydantic import BaseModel, EmailStr

router = APIRouter()

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    message: str

@router.post("/contact")
async def contact_form_submit(
    msg: ContactMessage
) -> Any:
    """
    Public Contact Us form submission.
    """
    # In a real app, send email via SES/SendGrid/SMTP
    print(f"============================================")
    print(f"[CONTACT FORM] From: {msg.name} <{msg.email}>")
    print(f"Message: {msg.message}")
    print(f"============================================")
    
    return {"message": "Message received. We'll get back to you shortly."}
