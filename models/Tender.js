const mongoose = require('mongoose');

const TenderSchema = new mongoose.Schema(
  {
    source: { type: String, default: 'TED' },
    title: String,
    description_raw: String,
    cpv_codes: { type: [String], default: [] },
    country: String,
    authority: String,
    estimated_value_eur: Number,
    deadline_iso: String,
    published_iso: String,
    document_links: { type: [String], default: [] },
    notice_url: String,
    lang: String,
    relevance_score: Number,
    matched_reasons: { type: [String], default: [] },
    status: { type: String, default: 'new' }, // new | shortlisted | drafting | submitted | lost | won
  },
  { timestamps: true }
);

TenderSchema.index({ country: 1, cpv_codes: 1, deadline_iso: 1 });

module.exports = mongoose.model('Tender', TenderSchema);
