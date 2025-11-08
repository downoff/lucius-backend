// models/ProposalDraft.js
const mongoose = require('mongoose');

const ProposalDraftSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    tenderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true },
    tenderTitle: { type: String, required: true },
    bodyText: { type: String, required: true },

    // Optional meta
    model: { type: String, default: 'gpt-4o' },
    tokensUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ProposalDraft || mongoose.model('ProposalDraft', ProposalDraftSchema);
