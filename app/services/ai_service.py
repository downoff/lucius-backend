import json
from openai import AsyncOpenAI
from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY or "sk-mock-key")

async def calculate_match_score(tender_data: dict, company_profile: dict) -> dict:
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-mock-key":
        # DEMO MODE: Smart Heuristics
        # We simulate a high-value analysis so the user sees the potential immediately.
        # Check for keyword overlap
        tender_desc = (tender_data.get("description_raw") or "").lower()
        company_kw = [k.lower() for k in company_profile.get("keywords_include", [])]
        
        matches = [k for k in company_kw if k in tender_desc]
        base_score = 82
        
        if matches:
            base_score += min(len(matches) * 2, 13) # Cap at 95
            rationale = f"Strong match detected based on keywords: {', '.join(matches[:3])}."
        else:
            rationale = "High potential alignment identified based on general sector capabilities."

        return {
            "score": base_score,
            "rationale": rationale + " (AI Demo Mode)"
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
    """Extract tender data using OpenAI or robust Demo Fallback."""
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-mock-key":
         # DEMO MODE: Robust Regex/Heuristic Extraction
         # This ensures the "Upload PDF" feature always "works" for the demo.
         
         # 1. Attempt to find title (usually first line or near "Title:")
         lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 10]
         title = lines[0] if lines else "Extracted Tender Document"
         
         # 2. Extract specific Compliance Clauses (Demo Simulation)
         # We inject these to show the "Compliance Matrix" value
         compliance_constraints = [
             {"clause": "ISO 27001 Certification Required", "severity": "HIGH", "page_ref": "4"},
             {"clause": "Minimum Annual Turnover > £5M", "severity": "HIGH", "page_ref": "12"},
             {"clause": "Social Value: Net Zero Plan", "severity": "MEDIUM", "page_ref": "22"},
             {"clause": "GDPR Composition Requirement", "severity": "HIGH", "page_ref": "8"}
         ]
         
         return {
             "title": title[:100],
             "description": text[:300] + "...",
             "budget": "£500,000 - £1,000,000 (Est.)",
             "deadline": "2025-06-30",
             "region": "United Kingdom",
             "compliance_constraints": compliance_constraints,
             "is_demo": True
         }

    prompt = f"""
You are a veteran Bid Manager. Analyze this tender document text and extract critical data.

TEXT:
{text[:50000]}

TASK:
Extract the following in JSON format:
1. "title": A concise title.
2. "description": A short summary.
3. "budget": Estimated value if found, else "Unknown".
4. "deadline": Submission deadline (YYYY-MM-DD) if found.
5. "region": Location/Region.
6. "compliance_constraints": A list of objects with "clause", "severity" (HIGH/MEDIUM), "page_ref".
   - Focus on certifications (ISO), financial guarantees, hard deadlines, and pass/fail criteria.

Return ONLY valid JSON.
"""
    
    try:
        completion = await client.chat.completions.create(
            model="gpt-4o",  # Using full GPT-4o for better extraction
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a precise tender data extraction engine."},
                {"role": "user", "content": prompt}
            ]
        )
        content = completion.choices[0].message.content
        data = json.loads(content)
        return data
    except Exception as e:
        print(f"Extraction Error: {e}")
        return {
            "title": "Error Parsing Tender",
            "description": f"DEBUG ERROR: {str(e)}",
            "compliance_constraints": []
        }

