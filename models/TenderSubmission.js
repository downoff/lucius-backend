const mongoose = require('mongoose');

const TenderSubmissionSchema = new mongoose.Schema({
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    tender_id: String,
    title: {
        type: String,
        required: true
    },
    estimated_value: {
        type: Number, // In euros
        default: 0
    },
    submitted_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    outcome: {
        type: String,
        enum: ['pending', 'won', 'lost', 'withdrawn'],
        default: 'pending'
    },
    won_at: Date,
    notes: String,
    used_lucius_ai: {
        type: Boolean,
        default: true
    },
    time_saved_hours: {
        type: Number,
        default: 8 // Default estimate
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TenderSubmission', TenderSubmissionSchema);
