const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Job = require('../models/Job');

// Safely import analyzeTenderPDF - may not be available if Python backend isn't configured
let analyzeTenderPDF = null;
try {
  const pythonAnalysisService = require('../services/pythonAnalysisService');
  analyzeTenderPDF = pythonAnalysisService.analyzeTenderPDF;
} catch (error) {
  console.warn('[Upload] Could not load pythonAnalysisService:', error.message);
  // Function will remain null, queueWorker will handle processing
}

// Configure Multer for PDF Uploads
const fs = require('fs');
const uploadDir = path.join(__dirname, '../data/uploads');

// Ensure upload directory exists
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`[Upload] Created upload directory: ${uploadDir}`);
  }
} catch (error) {
  console.error(`[Upload] Failed to create upload directory: ${error.message}`);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure dir exists on each upload (in case it was deleted)
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      cb(new Error(`Failed to access upload directory: ${error.message}`));
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'tender-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/upload
 * Accepts a PDF file, creates a Job, and returns the Job ID.
 */
router.post('/', upload.single('file'), async (req, res) => {
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

    // Check MongoDB connection before creating job
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database unavailable',
        message: 'Please try again in a moment'
      });
    }

    // Create Job with initial progress
    const job = new Job({
      type: 'pdf_analysis',
      status: 'pending',
      progress: 5, // Start with 5% to show something immediately
      payload: {
        filePath: req.file.path,
        originalName: req.file.originalname,
        companyContext: companyContext
      }
    });

    await job.save();

    // Try Python backend first if available (non-blocking)
    // If it fails or isn't available, queueWorker will pick it up
    setImmediate(async () => {
      try {
        // Only try Python backend if function is available
        if (analyzeTenderPDF && typeof analyzeTenderPDF === 'function') {
          const analysis = await analyzeTenderPDF(req.file.path);
          
          if (analysis) {
            // Python analysis succeeded - update job with results
            await Job.findByIdAndUpdate(job._id, {
              status: 'completed',
              progress: 100,
              result: analysis,
              completedAt: new Date()
            });
            return; // Success, don't use fallback
          }
        }
        
        // Python backend unavailable or not configured - queueWorker will handle it
        console.log('[Upload] Using queueWorker for analysis');
        // Job status remains 'pending' so queueWorker can process it
      } catch (error) {
        console.error('[Upload] Python analysis error:', error.message);
        // Don't mark as failed - let queueWorker try
        // Job status remains 'pending' so queueWorker can process it
      }
    });

    res.status(201).json({
      message: 'Upload successful. Analysis started.',
      jobId: job._id,
      status: 'pending'
    });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/upload/jobs/:id
 * Poll this endpoint to get status and results.
 */
router.get('/jobs/:id', async (req, res) => {
  const jobId = req.params.id;
  const startTime = Date.now();
  
  console.log(`[Upload/GET] Request started for job ID: ${jobId}`);
  console.log(`[Upload/GET] MongoDB connection state: ${mongoose.connection.readyState} (1=connected, 2=connecting, 0=disconnected)`);
  
  try {
    // Validate job ID format first (before DB check)
    if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
      console.warn(`[Upload/GET] Invalid job ID format: ${jobId}`);
      return res.status(400).json({ 
        error: 'Invalid job ID format',
        jobId: jobId 
      });
    }

    // Check if jobId looks like a valid MongoDB ObjectId (24 hex chars)
    if (!/^[0-9a-fA-F]{24}$/.test(jobId)) {
      console.warn(`[Upload/GET] Job ID does not match ObjectId format: ${jobId}`);
      return res.status(400).json({ 
        error: 'Invalid job ID format. Expected 24-character hexadecimal string.',
        jobId: jobId 
      });
    }

    // Check MongoDB connection with timeout protection
    if (mongoose.connection.readyState !== 1) {
      console.warn(`[Upload/GET] Database not connected. State: ${mongoose.connection.readyState}`);
      return res.status(503).json({ 
        error: 'Database unavailable',
        message: 'Please try again in a moment',
        dbState: mongoose.connection.readyState
      });
    }

    console.log(`[Upload/GET] Querying database for job: ${jobId}`);
    
    // Query with explicit error handling
    let job;
    try {
      job = await Job.findById(jobId).lean(); // Use .lean() for faster queries, returns plain JS object
    } catch (dbError) {
      console.error(`[Upload/GET] Database query error for job ${jobId}:`, dbError.message);
      console.error(`[Upload/GET] Error type: ${dbError.name}, stack: ${dbError.stack}`);
      
      // Handle specific MongoDB errors
      if (dbError.name === 'CastError') {
        return res.status(400).json({ 
          error: 'Invalid job ID format',
          jobId: jobId 
        });
      }
      
      // If it's a connection error, return 503
      if (dbError.name === 'MongoNetworkError' || dbError.name === 'MongoServerSelectionError') {
        return res.status(503).json({ 
          error: 'Database connection error',
          message: 'Please try again in a moment'
        });
      }
      
      // Unknown database error
      throw dbError; // Re-throw to be caught by outer catch
    }

    if (!job) {
      console.warn(`[Upload/GET] Job not found: ${jobId}`);
      return res.status(404).json({ 
        error: 'Job not found',
        jobId: jobId 
      });
    }

    const responseData = {
      id: job._id || jobId,
      status: job.status || 'unknown',
      progress: typeof job.progress === 'number' ? job.progress : 0,
      result: job.result || null,
      createdAt: job.createdAt || null,
      updatedAt: job.updatedAt || null
    };

    const duration = Date.now() - startTime;
    console.log(`[Upload/GET] Successfully returned job ${jobId} (status: ${responseData.status}, progress: ${responseData.progress}%) in ${duration}ms`);
    
    return res.json(responseData);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Upload/GET] ERROR after ${duration}ms for job ${jobId}:`);
    console.error(`[Upload/GET] Error name: ${error.name}`);
    console.error(`[Upload/GET] Error message: ${error.message}`);
    console.error(`[Upload/GET] Error stack: ${error.stack}`);
    
    // Ensure we always send a response (never leave hanging)
    if (!res.headersSent) {
      // Check if it's a MongoDB error that we haven't handled
      if (error.name === 'CastError' || error.message?.includes('Cast to ObjectId')) {
        return res.status(400).json({ 
          error: 'Invalid job ID format',
          jobId: jobId 
        });
      }
      
      // Check if it's a connection error
      if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError' || error.name === 'MongoTimeoutError') {
        return res.status(503).json({ 
          error: 'Database connection error',
          message: 'Please try again in a moment'
        });
      }
      
      // Generic error handler - always return JSON
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while fetching job status'
      });
    } else {
      // Headers already sent - just log the error
      console.error(`[Upload/GET] Cannot send error response - headers already sent for job ${jobId}`);
    }
  }
});

// Error handler for multer errors (file size, file type, etc.)
// This ensures multer errors return JSON instead of HTML
// MUST be placed after all routes to catch errors from all route handlers
router.use((error, req, res, next) => {
  // Check for multer errors (they have a 'code' property)
  if (error && error.code) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field. Use "file" as the field name.' });
    }
    return res.status(400).json({ error: error.message || 'File upload error' });
  }
  
  // Handle other upload-related errors (e.g., file type validation from fileFilter)
  if (error) {
    return res.status(400).json({ error: error.message || 'Upload failed' });
  }
  
  next(error);
});

module.exports = router;
