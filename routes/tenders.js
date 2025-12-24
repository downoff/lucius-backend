// routes/tenders.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Lazy-load Tender model (avoids OverwriteModelError on Render)
const Tender = mongoose.models.Tender || require("../models/Tender");

/**
 * GET /api/tenders/matching
 *
 * For now this is a SAFE, SIMPLE implementation for demo:
 * - Returns the latest tenders from Mongo (if any)
 * - Never crashes on missing data
 */
const { fetchTendersByRegion } = require("../services/tendersProvider");
const { ingestFromTED } = require("../services/tenderIngestor");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const TENDERS_FILE = path.join(DATA_DIR, "tenders.json");

// Load persist cache on start
try {
  if (fs.existsSync(TENDERS_FILE)) {
    global.latestTendersCache = JSON.parse(fs.readFileSync(TENDERS_FILE, "utf-8"));
    console.log(`[Tenders] Loaded ${global.latestTendersCache.length} tenders from persistent file.`);
  }
} catch (e) { console.warn("[Tenders] Failed to load local cache file", e); }

/**
 * POST /api/tenders/ingest
 * Trigger manual ingestion (protected)
 */
router.post("/ingest", async (req, res) => {
  const secret = req.headers["x-ingestion-secret"];
  const envSecret = process.env.INGESTION_SECRET;

  if (!envSecret || secret !== envSecret) {
    console.warn(`[Ingest] Unauthorized attempt. IP: ${req.ip}`);
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log("[Ingest] Manual ingestion triggered via API");

  // Start background process
  ingestFromTED()
    .then(() => console.log("[Ingest] Background job finished"))
    .catch(err => console.error("[Ingest] Background job failed:", err));

  return res.json({
    started: true,
    message: "Ingestion started in background. Check server logs for details."
  });
});

/**
 * GET /api/tenders/matching
 *
 * Returns tenders for a specific region (defaults to UK).
 * Query params:
 * - region: "UK", "DACH", "FR", "EU-East", "US", "Middle-East"
 */
router.get("/matching", async (req, res) => {
  try {
    const region = req.query.region || "UK";

    // 1. Fetch active company for personalized matching
    // 1. Fetch active company for personalized matching
    const Company = require("../models/Company");
    let activeCompany = null;

    if (mongoose.connection.readyState === 1) {
      try {
        activeCompany = await Company.findOne({ active: true }).lean().exec();
      } catch (e) { console.warn("Company fetch failed", e); }
    }

    // Fallback if no company is set yet (prevent crash, allows "browse mode")
    const companyContext = activeCompany || {
      company_name: "Guest User",
      keywords_include: ["general", "technology", "services"],
      description: "Generic company profile for browsing public tenders."
    };

    // 2. Fetch tenders for the requested region (External Source)
    let regionalTenders = [];
    try {
      regionalTenders = await fetchTendersByRegion(region, companyContext);
    } catch (fetchErr) {
      console.warn(`[Warning] External tender fetch failed for ${region}:`, fetchErr.message);
      // Continue to load from DB even if external fetch fails
    }

    // 3. Fetch local DB tenders (if any)
    let dbTenders = [];
    try {
      if (mongoose.connection.readyState === 1) {
        dbTenders = await Tender.find({})
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
          .exec();
      } else {
        console.warn("[Tenders] DB not connected, using cache.");
      }
    } catch (e) {
      console.warn("[Tenders] DB fetch failed, using cache.");
    }

    // Fallback to memory cache if DB is empty (Limited Mode)
    if (dbTenders.length === 0 && global.latestTendersCache) {
      // filter by region if possible, or return all
      dbTenders = global.latestTendersCache;
      if (region && region !== 'UK') {
        const targetCountries = {
          "DACH": ["DACH", "DE", "AT", "CH"],
          "EU-East": ["PL", "CZ", "HU", "SK", "RO", "BG", "EU-East"],
          "FR": ["FR"],
          "US": ["US"],
          "Middle-East": ["AE", "SA", "QA", "Middle-East"],
          "Nordics": ["SE", "NO", "DK", "FI"]
        };

        if (targetCountries[region]) {
          dbTenders = dbTenders.filter(t => targetCountries[region].includes(t.country));
        } else {
          // Fallback: direct match
          dbTenders = dbTenders.filter(t => t.country === region);
        }
      }
    }

    // ULTIMATE FALLBACK: Removed per user request. 
    // If no data, return empty array rather than mock data.
    if (regionalTenders.length === 0 && dbTenders.length === 0) {
      console.log("[Tenders] No real data available (Mock fallback disabled).");
      return res.json({ tenders: [], region, source: "live-empty" });
    }

    // 4. Combine
    const combined = [...regionalTenders, ...dbTenders];

    return res.json({ tenders: combined, region });
  } catch (err) {
    console.error("[Error] Failed to fetch matching tenders:", err);
    return res.status(500).json({
      message: "Unable to load tenders at this time. Please try again later."
    });
  }
});

/**
 * GET /api/tenders/:id
 * Used by the TenderDetail page.
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Support for in-memory IDs (Limited Mode)
    // Support for in-memory IDs (Limited Mode)
    // Support for in-memory/deterministic IDs (Limited Mode)
    if (id.startsWith("mem_") || id.startsWith("det_")) {
      console.log(`[Diff Debug] Looking for in-memory ID: ${id}`);
      if (!global.latestTendersCache) {
        console.log("[Diff Debug] Cache is empty/undefined");
        return res.status(404).json({ message: "Tender not found (cache empty)" });
      }
      console.log(`[Diff Debug] Cache size: ${global.latestTendersCache.length}`);
      const cachedTender = global.latestTendersCache.find(t => t._id === id);
      if (cachedTender) {
        console.log("[Diff Debug] Found in cache!");
        return res.json(cachedTender);
      }
      console.log("[Diff Debug] Not found in cache.");
      return res.status(404).json({ message: "Tender not found in cache" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid tender id" });
    }

    // Check connection before query to avoid timeout
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database not connected" });
    }

    const tender = await Tender.findById(id).lean().exec();
    if (!tender) {
      return res.status(404).json({ message: "Tender not found" });
    }

    // --- PAYWALL LOGIC ---
    // Check if the requesting user (company) is on the Pro plan
    // For this robust implementation, we check the 'Company' model associated with the session/user
    // But for simplicity/demo speed, we'll check a flag or defaulting to free.

    // NOTE: In a full auth system, `req.user` would be populated by passport/middleware.
    // Here we check if the company attached to the request (if any) is valid.
    const Company = require("../models/Company");

    // Simple check: Is the 'Demo' company paid? (For single-player mode)
    // Or if `req.user.companyId` exists.
    let isPro = false;
    // Mock check for now - in production, this comes from req.user.is_paid
    // const company = await Company.findOne({ active: true });
    // if (company && company.is_paid) isPro = true;

    // Redact high-value fields if not Pro
    if (!isPro) {
      if (tender.ai_proposal_draft) {
        // We keep the first 100 chars as a teaser, then blur the rest
        const teaser = tender.ai_proposal_draft.substring(0, 150);
        tender.ai_proposal_draft = `${teaser}...\n\n[🔒 UPGRADE TO PRO TO SEE FULL AI PROPOSAL]\n[This content is blurred for free tier users.]`;
        tender.is_blurred = true; // Frontend can use this to show a lock UI
      }

      // Also redact sensitive compliance matrix details if needed
      if (tender.compliance_matrix && tender.compliance_matrix.length > 3) {
        // show only first 3 items
        tender.compliance_matrix = tender.compliance_matrix.slice(0, 3);
        tender.compliance_matrix.push({ requirement: "20+ More Requirements Hidden", status: "locked", source_page: 0 });
      }
    }

    return res.json(tender);
  } catch (err) {
    console.error("get tender by id error:", err);
    return res.status(500).json({ message: "tender error" });
  }
});

/**
 * GET /api/tenders/demo-seed
 *
 * Helper route so you can quickly populate the DB
 * with 3 example tenders for demo purposes.
 *
 * Call once in browser:
 *   https://lucius-ai.onrender.com/api/tenders/demo-seed
 */
router.get("/demo-seed", async (_req, res) => {
  try {
    const count = await Tender.countDocuments().exec();
    if (count > 0) {
      return res.json({
        ok: true,
        alreadySeeded: true,
        count,
      });
    }

    const now = new Date();
    const inDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    // Fetch real tenders for seeding
    const realTenders = await fetchRealTenders();

    // Take top 3 real tenders, or fallback to hardcoded if fetch fails
    let tendersToInsert = realTenders.slice(0, 3).map(t => ({
      ...t,
      match_score: Math.floor(Math.random() * 15) + 80 // High score for demo
    }));

    if (tendersToInsert.length === 0) {
      // Fallback if RSS fails
      const inDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      tendersToInsert = [
        {
          title: "Municipal Smart City Portal with AI Assistant",
          short_description: "Design, build and maintain a public-facing portal with multilingual AI chatbot and integrations.",
          description_raw: "The contracting authority seeks a partner to deliver a modern smart city web portal with AI assistant, citizen tickets, and integrations to existing back-office systems.",
          country: "BA",
          deadline: inDays(18),
          budget: "€250,000 – €400,000",
          match_score: 92,
        },
        // ... (keep other fallbacks if desired, or just one is enough)
      ];
    }

    const docs = await Tender.insertMany(tendersToInsert);

    return res.json({
      ok: true,
      seeded: docs.length,
    });
  } catch (err) {
    console.error("demo-seed error:", err);
    return res.status(500).json({ message: "tender error" });
  }
});

/**
 * POST /api/tenders/upload
 * Upload tender PDF - proxies to /api/upload route
 * This route exists for frontend compatibility
 */
const multer = require('multer');
const Job = require('../models/Job');
const { analyzeTenderPDF } = require('../services/pythonAnalysisService');

const uploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../data/uploads');
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'tender-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: uploadStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse companyContext safely
    let companyContext = {};
    if (req.body.companyContext) {
      try {
        companyContext = JSON.parse(req.body.companyContext);
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid JSON in companyContext field' });
      }
    }

    // Create Job
    const job = new Job({
      type: 'pdf_analysis',
      status: 'pending',
      payload: {
        filePath: req.file.path,
        originalName: req.file.originalname,
        companyContext: companyContext
      }
    });

    await job.save();

    // Start analysis in background (call Python backend if available)
    setImmediate(async () => {
      try {
        // Try Python backend first (advanced analysis)
        const analysis = await analyzeTenderPDF(req.file.path);
        
        if (analysis) {
          // Python analysis succeeded - update job with results
          await Job.findByIdAndUpdate(job._id, {
            status: 'completed',
            progress: 100,
            result: analysis,
            completedAt: new Date()
          });
        } else {
          // Python backend unavailable - use Node.js fallback
          console.log('[Tenders/Upload] Python backend unavailable, using Node.js worker');
          // Your existing worker will handle this
        }
      } catch (error) {
        console.error('[Tenders/Upload] Analysis error:', error);
        await Job.findByIdAndUpdate(job._id, {
          status: 'failed',
          result: { error: error.message }
        });
      }
    });

    res.status(201).json({
      message: 'Upload successful. Analysis started.',
      jobId: job._id,
      status: 'pending',
      _id: job._id // For frontend compatibility
    });

  } catch (error) {
    console.error("Tender Upload Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Error handler for multer errors
router.use((error, req, res, next) => {
  if (error && error.code) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field. Use "file" as the field name.' });
    }
    return res.status(400).json({ error: error.message || 'File upload error' });
  }
  
  if (error) {
    return res.status(400).json({ error: error.message || 'Upload failed' });
  }
  
  next(error);
});

module.exports = router;
