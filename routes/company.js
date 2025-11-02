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

    // Billing / paywall
    is_paid: { type: Boolean, default: false },
    plan: { type: String, enum: ['starter', 'pro', 'enterprise', null], default: null },
    last_payment_at: { type: Date, default: null },
    stripe_customer_id: { type: String, default: null }, // <— NEW

    // Optional user link
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', CompanySchema);
