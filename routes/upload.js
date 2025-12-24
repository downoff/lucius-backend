const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Job = require('../models/Job');

// Configure Multer for PDF Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../data/uploads');
    // Ensure dir exists
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
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job._id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
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
