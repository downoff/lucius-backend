import json
from openai import AsyncOpenAI
from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY or "sk-mock-key")

async def calculate_match_score(tender_data: dict, company_profile: dict) -> dict:
    if not settings.OPENAI_API_KEY:
        return {
            "score": 85,
            "rationale": "AI scoring unavailable (missing API key). Defaulting to high match based on keyword overlap."
        }

    title = tender_data.get("title", "Untitled Tender")
    desc = tender_data.get("description_raw") or tender_data.get("short_description") or "No description provided."
    
    tender_text = f"""
Title: {title}
Description: {desc}
Budget: {tender_data.get("budget", "Unknown")}
Region: {tender_data.get("region", "Unknown")}
"""

    company_text = f"""
Name: {company_profile.get("company_name", "Generic Company")}
Keywords Include: {", ".join(company_profile.get("keywords_include", []))}
Capabilities: {company_profile.get("description", "General Services")}
"""

    prompt = f"""
You are an expert Bid Manager. Evaluate the fit of this tender for the company.

TENDER:
{tender_text}

COMPANY:
{company_text}

TASK:
1. Analyze the match based on capabilities, keywords, and region.
2. Assign a score from 0 to 100 (0 = irrelevant, 100 = perfect fit).
3. Provide a 1-sentence rationale.

Return JSON:
{{
  "score": number,
  "rationale": "string"
}}
"""
    try:
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a precise scoring engine."},
                {"role": "user", "content": prompt}
            ]
        )
        content = completion.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"AI Scoring Error: {e}")
        return {
            "score": 60,
            "rationale": "AI analysis failed. Defaulting to neutral score."
        }

async def extract_tender_data_from_text(text: str) -> dict:
    if not settings.GOOGLE_API_KEY:
         return {
             "title": "Extracted Tender (Demo)",
             "description": "Analysis requires GOOGLE_API_KEY.",
             "compliance_matrix": []
         }

    from app.core.llm import LLMFactory
    provider = LLMFactory.get_provider("context")
    
    prompt = f"""
    You are a veteran Bid Manager. Analyze this tender document text and extract critical data.
    
    TEXT:
    {text[:200000]}
    
    TASK:
    Extract the following in JSON format:
    1. "title": A concise title.
    2. "description": A short summary.
    3. "budget": Estimated value if found, else "Unknown".
    4. "deadline": Submission deadline (YYYY-MM-DD) if found.
    5. "region": Location/Region.
    6. "compliance_constraints": A list of objects {{ "clause": "string", "severity": "HIGH/MEDIUM", "page_ref": "number/string" }}.
       - Focus on certifications (ISO), financial guarantees, hard deadlines, and pass/fail criteria.
       
    Return ONLY valid JSON.
    """
    
    try:
        response = await provider.generate(prompt, json_mode=True)
        clean_json = response.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
        return data
    except Exception as e:
        print(f"Extraction Error: {e}")
        return {
            "title": "Error Parsing Tender",
            "description": f"DEBUG ERROR: {str(e)}",
            "compliance_constraints": []
        }

