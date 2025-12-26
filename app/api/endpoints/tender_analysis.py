"""
API endpoint for tender analysis engine
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
import tempfile
import os
from pathlib import Path
import logging

# CRITICAL: Define router FIRST before any potentially failing imports
router = APIRouter(prefix="/api/tender-analysis", tags=["tender-analysis"])

logger = logging.getLogger(__name__)

# Lazy import - only import when actually needed to avoid blocking router definition
try:
    from app.services.tender_analysis_engine import TenderAnalysisEngine
    TENDER_ENGINE_AVAILABLE = True
except ImportError as e:
    logger.warning(f"TenderAnalysisEngine not available: {e}")
    TenderAnalysisEngine = None
    TENDER_ENGINE_AVAILABLE = False

@router.post("/analyze")
async def analyze_tender_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF tender document and get comprehensive requirement extraction.
    Returns JSON with all requirements, compliance categories, and risk flags.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name
    
    try:
        # Check if engine is available
        if not TENDER_ENGINE_AVAILABLE or TenderAnalysisEngine is None:
            raise HTTPException(status_code=503, detail="Tender analysis engine is not available. Please check server configuration.")
        
        # Run analysis
        engine = TenderAnalysisEngine()
        result = await engine.analyze_tender(tmp_path)
        
        return JSONResponse(content=result)
    
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.post("/analyze/export-json")
async def analyze_and_export_json(file: UploadFile = File(...)):
    """Analyze PDF and return JSON file download"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name
    
    try:
        # Check if engine is available
        if not TENDER_ENGINE_AVAILABLE or TenderAnalysisEngine is None:
            raise HTTPException(status_code=503, detail="Tender analysis engine is not available. Please check server configuration.")
        
        engine = TenderAnalysisEngine()
        await engine.analyze_tender(tmp_path)
        
        # Export to JSON
        output_path = tmp_path.replace('.pdf', '_requirements.json')
        engine.export_to_json(output_path)
        
        return FileResponse(
            output_path,
            media_type='application/json',
            filename=f"{Path(file.filename).stem}_requirements.json"
        )
    
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.post("/analyze/export-csv")
async def analyze_and_export_csv(file: UploadFile = File(...)):
    """Analyze PDF and return CSV compliance matrix download"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name
    
    try:
        # Check if engine is available
        if not TENDER_ENGINE_AVAILABLE or TenderAnalysisEngine is None:
            raise HTTPException(status_code=503, detail="Tender analysis engine is not available. Please check server configuration.")
        
        engine = TenderAnalysisEngine()
        await engine.analyze_tender(tmp_path)
        
        # Export to CSV
        output_path = tmp_path.replace('.pdf', '_compliance_matrix.csv')
        engine.export_to_csv(output_path)
        
        return FileResponse(
            output_path,
            media_type='text/csv',
            filename=f"{Path(file.filename).stem}_compliance_matrix.csv"
        )
    
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

