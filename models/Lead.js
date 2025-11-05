// models/Lead.js
const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true },
    company: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, trim: true, maxlength: 3000 },
    source: { type: String, trim: true, default: "audit" },
    userAgent: { type: String, trim: true },
    ip: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
