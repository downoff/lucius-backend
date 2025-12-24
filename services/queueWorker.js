const Job = require('../models/Job');
const { analyzeTenderText } = require('./aiService');
const fs = require('fs');
const pdfParse = require('pdf-parse');

// Queue Worker Logic
// In a real production environment with multiple instances, use Redis (Bull).
// For this setup (Render Single Instance), a setInterval loop is sufficient and robust enough.

let isProcessing = false;

async function processQueue() {
  if (isProcessing) return; // Prevent overlapping runs
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
    console.error("[Queue] Worker Error:", err);
  } finally {
    isProcessing = false;
  }
}

async function handlePdfAnalysis(job) {
  try {
    // Step 1: Read PDF
    await updateProgress(job._id, 15, "Reading PDF...");

    if (!fs.existsSync(job.payload.filePath)) {
      throw new Error("File not found on server");
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
    
    const analysisResult = await analyzeTenderText(text, job.payload.companyContext);
    
    await updateProgress(job._id, 85, "Finalizing results...");

    // Step 3: Parse & Save Results
    // We map the raw AI result to our Job Schema "result" structure
    const resultPayload = {
      compliance_matrix: analysisResult.compliance_matrix,
      score: analysisResult.risk_score,
      rationale: "Analysis complete based on extraction.",
      proposal_draft: analysisResult.generated_proposal_draft
    };

    // Step 4: Complete
    await Job.findByIdAndUpdate(job._id, {
      status: 'completed',
      completedAt: new Date(),
      progress: 100,
      result: resultPayload
    });

    console.log(`[Queue] Job ${job._id} Completed Successfully`);

  } catch (error) {
    console.error(`[Queue] Job ${job._id} Failed:`, error.message);
    await Job.findByIdAndUpdate(job._id, {
      status: 'failed',
      completedAt: new Date(),
      result: { error: error.message }
    });
  }
}

async function updateProgress(jobId, percent, message) {
  // Optional: Add a "message" field to Job if you want detailed status text in UI
  await Job.findByIdAndUpdate(jobId, { progress: percent });
}

// Start the Worker - Faster polling for quicker job pickup
function startWorker(intervalMs = 1000) {
  console.log("[Queue] Worker started. Polling every " + intervalMs + "ms");
  // Process immediately on startup, then set interval
  processQueue();
  setInterval(processQueue, intervalMs);
}

module.exports = { startWorker };
