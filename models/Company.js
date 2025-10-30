const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    company_name: { type: String, required: true },
    website: String,
    countries: { type: [String], default: [] },
    cpv_codes: { type: [String], default: [] },
    keywords_include: { type: [String], default: [] },
    keywords_exclude: { type: [String], default: [] },
    max_deadline_days: { type: Number, default: 45 },
    languages: { type: [String], default: ['en'] },
    contact_emails: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', CompanySchema);
