const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const fs = require('fs');
const pdf = require('pdf-parse');
const Job = require('../models/Job');
const aiService = require('../services/aiService');

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379'
};

// Ensure Redis URL is parsed correctly by BullMQ if needed, 
// usually passing 'connection: { url: ... }' works or parsing it manually.
// For robustness, if REDIS_URL is set, we might need to parse simple implementation.

console.log(`[Worker] Initializing PDF Processor with Redis: ${connection.url}`);

const worker = new Worker('pdf-processing-queue', async (job) => {
  console.log(`[Worker] Starting Job ${job.id}`);

  try {
    const { jobId, filePath } = job.data;

    // 1. Update DB Status
    await Job.findOneAndUpdate({ _id: jobId }, {
      status: 'processing',
      startedAt: new Date(),
      progress: 10
    });

    // 2. Parse PDF
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    const rawText = pdfData.text;

    // Safety Truncate
    const safeText = rawText.substring(0, 100000);

    // Update progress
    await Job.findOneAndUpdate({ _id: jobId }, { progress: 30 });

    // 3. Call AI (Granular Steps)
    console.log(`[Worker] Job ${jobId}: Generating Compliance Matrix...`);
    const compliance = await aiService.generateWithFallback(safeText, 'compliance');
    await Job.findOneAndUpdate({ _id: jobId }, { progress: 50 });

    console.log(`[Worker] Job ${jobId}: Analyzing Risk...`);
    const risk = await aiService.generateWithFallback(safeText, 'risk');
    await Job.findOneAndUpdate({ _id: jobId }, { progress: 70 });

    console.log(`[Worker] Job ${jobId}: Drafting Proposal...`);
    const proposal = await aiService.generateWithFallback(safeText, 'proposal');

    // 4. Save Results
    await Job.findOneAndUpdate({ _id: jobId }, {
      status: 'completed',
      completedAt: new Date(),
      progress: 100,
      result: {
        compliance_matrix: compliance.requirements,
        risk_score: risk.score,
        rationale: risk.rationale,
        proposal_draft: proposal.text
      }
    });

    console.log(`[Worker] Job ${jobId} Completed Successfully.`);

  } catch (error) {
    console.error(`[Worker] Job ${job.id} Failed:`, error);

    // Update DB with Error
    if (job.data && job.data.jobId) {
      await Job.findOneAndUpdate({ _id: job.data.jobId }, {
        status: 'failed',
        completedAt: new Date(),
        result: { error: error.message }
      });
    }

    throw error; // Let BullMQ handle retry logic if configured
  }

}, {
  connection: {
    url: process.env.REDIS_URL
  },
  concurrency: 1 // RAM constrained environment
});

worker.on('completed', job => {
  console.log(`[Worker] Job ${job.id} finished.`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} has failed with ${err.message}`);
});

module.exports = worker;
