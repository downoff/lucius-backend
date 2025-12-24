const Job = require('../models/Job');
const { analyzeTenderText } = require('./aiService');
const fs = require('fs');
const mongoose = require('mongoose');

// Import pdf-parse - version 2.4+ uses a class, create a wrapper function
const pdfParseModule = require('pdf-parse');
const PDFParse = pdfParseModule.PDFParse;

// Wrapper function to match the old API: pdfParse(buffer) -> Promise<{text, ...}>
const pdfParse = async (buffer, options = {}) => {
  const parser = new PDFParse({ data: buffer, ...options });
  const result = await parser.getText();
  return {
    text: result.text || '',
    numPages: result.total || 0,
    pages: result.pages || []
  };
};

// Queue Worker Logic
// In a real production environment with multiple instances, use Redis (Bull).
// For this setup (Render Single Instance), a setInterval loop is sufficient and robust enough.

let isProcessing = false;

async function processQueue() {
  if (isProcessing) return; // Prevent overlapping runs
  
  // Check if MongoDB is connected before processing
  if (mongoose.connection.readyState !== 1) {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    return; // Skip this cycle, wait for connection
  }
  
  isProcessing = true;

  try {
    // 1. Find the next pending job
    // Use findOneAndUpdate to atomically "lock" the job
    const job = await Job.findOneAndUpdate(
      { status: 'pending' },
      {
        $set: {
          status: 'processing',
          startedAt: new Date(),
          progress: 12 // Set to 12% when processing starts (was 5% on creation)
        }
      },
      { sort: { createdAt: 1 }, new: true } // FIFO
    );

    if (!job) {
      isProcessing = false;
      return; // No jobs, sleep
    }

    console.log(`[Queue] Processing Job ${job._id} (${job.type})`);

    // 2. Perform Task based on Type
    if (job.type === 'pdf_analysis') {
      await handlePdfAnalysis(job);
    }

    // Add other job types here...

  } catch (err) {
    // Check if it's a MongoDB connection error
    if (err.name === 'MongoServerError' || err.name === 'MongooseError' || err.message?.includes('Mongo')) {
      console.error("[Queue] MongoDB connection error, will retry on next cycle:", err.message);
    } else {
      console.error("[Queue] Worker Error:", err.message || err);
    }
  } finally {
    isProcessing = false;
  }
}

async function handlePdfAnalysis(job) {
  try {
    // Step 1: Read PDF
    await updateProgress(job._id, 15, "Reading PDF...");

    if (!fs.existsSync(job.payload.filePath)) {
      throw new Error(`File not found on server: ${job.payload.filePath}`);
    }

    await updateProgress(job._id, 25, "Parsing PDF content...");
    const dataBuffer = fs.readFileSync(job.payload.filePath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    if (!text || text.length < 50) {
      throw new Error("PDF appears empty or unreadable");
    }

    // Step 2: AI Analysis - Break into smaller chunks for progress
    await updateProgress(job._id, 35, "Extracting requirements...");
    
    await updateProgress(job._id, 50, "Analyzing compliance matrix...");
    await updateProgress(job._id, 60, "Calculating risk score...");
    await updateProgress(job._id, 70, "Generating proposal draft...");
    
    const analysisResult = await analyzeTenderText(text, job.payload.companyContext || {});
    
    await updateProgress(job._id, 85, "Finalizing results...");

    // Step 3: Parse & Save Results
    // We map the raw AI result to our Job Schema "result" structure
    const resultPayload = {
      compliance_matrix: analysisResult.compliance_matrix || [],
      score: analysisResult.risk_score || 0,
      rationale: "Analysis complete based on extraction.",
      proposal_draft: analysisResult.generated_proposal_draft || ""
    };

    // Step 4: Complete - Check MongoDB connection before saving
    if (mongoose.connection.readyState === 1) {
      await Job.findByIdAndUpdate(job._id, {
        status: 'completed',
        completedAt: new Date(),
        progress: 100,
        result: resultPayload
      });
      console.log(`[Queue] Job ${job._id} Completed Successfully`);
    } else {
      console.error(`[Queue] Cannot save job ${job._id} - MongoDB not connected`);
      throw new Error("Database connection lost during processing");
    }

  } catch (error) {
    console.error(`[Queue] Job ${job._id} Failed:`, error.message);
    
    // Try to save error status, but don't fail if DB is down
    try {
      if (mongoose.connection.readyState === 1) {
        await Job.findByIdAndUpdate(job._id, {
          status: 'failed',
          completedAt: new Date(),
          result: { error: error.message }
        });
      }
    } catch (dbError) {
      console.error(`[Queue] Failed to save error status for job ${job._id}:`, dbError.message);
    }
  }
}

async function updateProgress(jobId, percent, message) {
  try {
    // Check MongoDB connection before updating
    if (mongoose.connection.readyState !== 1) {
      console.warn(`[Queue] Skipping progress update - MongoDB not connected (Job: ${jobId})`);
      return;
    }
    // Optional: Add a "message" field to Job if you want detailed status text in UI
    await Job.findByIdAndUpdate(jobId, { progress: percent });
  } catch (error) {
    console.error(`[Queue] Failed to update progress for job ${jobId}:`, error.message);
    // Don't throw - progress update failure shouldn't stop job processing
  }
}

// Start the Worker - Faster polling for quicker job pickup
function startWorker(intervalMs = 1000) {
  console.log("[Queue] Worker started. Polling every " + intervalMs + "ms");
  // Process immediately on startup, then set interval
  processQueue();
  setInterval(processQueue, intervalMs);
}

module.exports = { startWorker };
