from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from app.api import deps
from app.services import ai_service
from app.models.company import CompanyInDB
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import openai
from app.core.config import settings

router = APIRouter()

async def ensure_paid(
    company_id: Optional[str] = Body(None),
    company_id_query: Optional[str] = None, # allow query param too if needed
    db: AsyncIOMotorDatabase = Depends(deps.get_db)
):
    """
    Dependency to enforce paywall. 
    Returns the company object if allowed, raises HTTPException if not.
    """
    cid = company_id or company_id_query
    if not cid:
         # For simplicity in this migration, if no company_id provided, 
         # we might check if user is logged in and fetch their company.
         # But Node implementation demanded company_id in body/query.
         raise HTTPException(status_code=400, detail="company_id required")

    company = await db.companies.find_one({"_id": ObjectId(cid)})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    is_paid = company.get("is_paid", False) or \
              company.get("plan") in ["agency", "enterprise"] or \
              company.get("stripe_customer_id") # Naive check matching Node?
              
    # Node logic: if (!company.stripe_customer_id) return 402
    # So strict check on stripe_customer_id existence (which implies they tried to pay or are registered properly)
    # Actually Node said: if (!company.stripe_customer_id) return 402. THIS EXCLUDES FREE USERS?
    # Wait, Node has `PAYWALL_FREE` env var.
    
    # Strict Paywall Enforcement (Growth Phase 2)
    if not company.get("stripe_customer_id") and not company.get("is_paid"):
         # Allow 1 free draft? For now, strict 402.
         # Exception: If company is "Lucius Demo Corp" (for testing)
         if "demo" not in company.get("company_name", "").lower():
             raise HTTPException(status_code=402, detail="Premium Feature: Please upgrade to Pro to use AI Drafting.")
    
    # Proposals count check
    # if not is_paid_plan ... check limit.
    
    return company

@router.post("/draft")
async def generate_draft(
    tender_id: Optional[str] = Body(None),
    tender_text: Optional[str] = Body(None),
    db: AsyncIOMotorDatabase = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
):
    # 1. Strict Paywall Enforcement
    if not current_user.company_id:
         raise HTTPException(status_code=402, detail="No company found. Please upgrade.")

    company = await db.companies.find_one({"_id": current_user.company_id})
    if not company:
         raise HTTPException(status_code=404, detail="Company not found")

    # Allow if 'is_paid' is True OR plan is 'agency'/'enterprise'
    # Also allow if company name contains "Demo" (for internal testing)
    is_paid = company.get("is_paid", False) or \
              company.get("plan") in ["Agency", "Enterprise", "agency", "enterprise"]

    if not is_paid and "demo" not in company.get("company_name", "").lower():
         raise HTTPException(status_code=402, detail="Premium Feature: Please upgrade to Pro to use AI Drafting.")
    
    company_data = company

    # Content resolution
    final_text = tender_text
    if not final_text and tender_id:
        t = await db.tenders.find_one({"_id": ObjectId(tender_id)})
            final_text = f"{t.get('title', '')}\n{t.get('description_raw', '')}"
            
    if not final_text:
        final_text = "General public sector tender requirements."

    # ... (previous code) ...
    
    # 1. Retrieve RAG Context (Past Winning Proposals)
    from app.services import rag_service
    winning_examples = await rag_service.query_similar(final_text, n_results=2)
    style_guide = "\n\n".join(winning_examples)
    
    rag_prompt = ""
    if style_guide:
        rag_prompt = f"REFERENCE style from these past winning proposals:\n---\n{style_guide[:1500]}\n---\n"

    # 2. Use LLM Factory ("writing" = Claude if available, else GPT)
    from app.core.llm import LLMFactory
    llm = LLMFactory.get_provider("writing")
    
    prompt = f"""
You are a Senior Bid Manager for {company_data.get('company_name', 'our company')}. create a strategic, winning proposal draft.

CONTEXT:
Tender: "{final_text[:5000]}..."
Our Profile: "{company_data.get('description', 'Generic Service Provider')}"

{rag_prompt}

TASK:
Write a ~1200 word proposal that persuades the evaluator we are the ONLY viable choice.

STRUCTURE & REQUIREMENTS:
1.  **Executive Summary (The Hook):**
    - State our unique value proposition immediately.
    - Reference specific pain points from the tender requirements.
2.  **Understanding & Approach (The "How"):**
    - Don't just regurgitate the requirements. Explain *how* we solve them better.
    - Use "Win Themes" (e.g., Speed, Safety, innovation).
3.  **Risk Mitigation (The "Trust"):**
    - Proactively identify 2-3 potential risks in this project and how we mitigate them.
4.  **Team & Experience:**
    - Highlight relevant experience.
5.  **Pricing & Value:**
    - Focus on ROI, not just cost.
6.  **References:**
    - Mention we have served similar clients (generic placeholder if unknown).

TONE:
- Specific, Authoritative, Partner-focused.
- Avoid fluff. Use active voice.
"""
    try:
        draft_content = await llm.generate(prompt)
        return {"draft": draft_content, "meta": {"source": llm.__class__.__name__}}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"AI Proposal Error: {e}")
        return {"draft": _build_fallback(final_text), "meta": {"source": "fallback-error"}}

def _build_fallback(text):
    return f"""# Proposal Draft (Fallback)

## Executive Summary
We propose to act as your partner...

## Requirements
Based on: {text[:200]}...

(AI generation unavailable, please check API keys)
"""
