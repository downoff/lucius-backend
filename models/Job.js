const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['pdf_analysis', 'compliance_check']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  payload: {
    filePath: { type: String, required: true },
    originalName: { type: String },
    companyContext: { type: mongoose.Schema.Types.Mixed } // Optional context for AI
  },
  result: {
    score: Number,
    rationale: String,
    compliance_matrix: Array,
    proposal_draft: String,
    error: String
  },
  progress: {
    type: Number,
    default: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Assuming you have a User model, optional for now
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  startedAt: Date,
  completedAt: Date
});

// Middleware to update `updatedAt`
JobSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Job', JobSchema);
