import resend
from app.core.config import settings

# Initialize Resend
if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY

async def send_email(to_email: str, subject: str, html_content: str):
    """
    Send an email via Resend.
    """
    if not settings.RESEND_API_KEY:
        print(f"[MAIL MOCK] To: {to_email} | Subject: {subject}")
        return {"id": "mock-email-id"}
        
    try:
        # Resend SDK is synchronous, but fast. 
        # For high scale, run in a separate thread/task or use async http client.
        # For simplicity in this codebase, direct call.
        params = {
            "from": "Lucius AI <onboarding@resend.dev>", # Default Testing Domain
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        
        email = resend.Emails.send(params)
        print(f"[MAIL SENT] To: {to_email} | ID: {email.get('id')}")
        return email
        
    except Exception as e:
        print(f"[MAIL ERROR] Failed to send to {to_email}: {e}")
        # Improve: don't crash the request logic if email fails?
        # For auth, maybe we want to know?
        return None
