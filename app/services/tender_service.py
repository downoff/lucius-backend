import httpx
import logging
from datetime import datetime
from app.api.deps import get_db
from app.models.tender import TenderInDB
from app.services.ai_service import calculate_match_score

logger = logging.getLogger(__name__)

DEMO_COMPANY = {
  "company_name": "LuciusAI Generic",
  "keywords_include": ["software", "digital", "platform", "cloud", "data", "cybersecurity"],
  "description": "General Services"
}

async def ingest_uk_tenders():
    url = "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?limit=50"
    logger.info(f"Fetching tenders from {url}")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"Failed to fetch UK tenders: {e}")
            return {"error": str(e)}

    results = data.get("results", [])
    logger.info(f"Received {len(results)} notices")
    
    db = await get_db()
    
    processed = 0
    new_count = 0
    
    for notice in results:
        try:
            releases = notice.get("releases", [])
            if not releases:
                continue
            latest_release = releases[0]
            
            tender_info = latest_release.get("tender", {})
            buyer = latest_release.get("buyer", {})
            
            tender_url = ""
            if latest_release.get("id"):
                tender_url = f"https://www.contractsfinder.service.gov.uk/Notice/{latest_release.get('id')}"
            
            deadline_str = tender_info.get("tenderPeriod", {}).get("endDate")
            deadline = datetime.fromisoformat(deadline_str.replace("Z", "+00:00")) if deadline_str else None
            
            published_str = latest_release.get("date")
            published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00")) if published_str else datetime.utcnow()
            
            amount = tender_info.get("value", {}).get("amount")
            budget = f"£{amount:,}" if amount else "N/A"
            
            tender_obj = {
                "title": tender_info.get("title", "Untitled Tender"),
                "description_raw": tender_info.get("description", ""),
                "authority": buyer.get("name", "Public Authority"),
                "country": "UK",
                "region": "UK",
                "deadline_iso": deadline.isoformat() if deadline else None,
                "url": tender_url,
                "source": "UK-Official",
                # Extra fields for UI
                "budget": budget,
                "published_at": published_at
            }
            
            # AI Score
            ai_result = await calculate_match_score(tender_obj, DEMO_COMPANY)
            tender_obj["match_score"] = ai_result.get("score")
            tender_obj["rationale"] = ai_result.get("rationale")
            
            # Upsert
            existing = await db.tenders.find_one({"url": tender_url})
            if existing:
                await db.tenders.update_one({"_id": existing["_id"]}, {"$set": tender_obj})
            else:
                tender_obj["created_at"] = datetime.utcnow()
                tender_obj["updated_at"] = datetime.utcnow()
                await db.tenders.insert_one(tender_obj)
                new_count += 1
            
            processed += 1
            
        except Exception as e:
            logger.error(f"Error processing tender: {e}")
            continue
            
    return {"processed": processed, "new": new_count}
