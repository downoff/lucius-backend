// models/Company.js
const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    company_name: { type: String, required: true },
    website: { type: String },
    countries: [{ type: String }],
    cpv_codes: [{ type: String }],
    keywords_include: [{ type: String }],
    keywords_exclude: [{ type: String }],
    max_deadline_days: { type: Number, default: 45 },
    languages: [{ type: String }],
    contact_emails: [{ type: String }],
    team_size: { type: String },
    tender_volume: { type: String },

    // Payments/plan
    is_paid: { type: Boolean, default: false },
    plan: { type: String, default: null }, // 'starter', etc.
    last_payment_at: { type: Date, default: null },
    stripe_customer_id: { type: String, default: null },

    // Referrals
    referral_code: { type: String, unique: true, sparse: true },
    referrals_count: { type: Number, default: 0 },
    referral_credits: { type: Number, default: 0 }, // in euros
    referred_by: { type: String, default: null }, // referral code of referrer
  },
  { timestamps: true }
);

// Defensive export to avoid OverwriteModelError in serverless / hot-reload
module.exports =
  mongoose.models.Company || mongoose.model('Company', CompanySchema);
