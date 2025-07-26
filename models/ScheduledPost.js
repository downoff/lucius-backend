const mongoose = require('mongoose');

const scheduledPostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxLength: 280 },
    platform: { type: String, enum: ['X/Twitter'], required: true },
    status: { type: String, enum: ['scheduled', 'posted', 'failed'], default: 'scheduled' },
    scheduledAt: { type: Date, required: true },
    postedAt: { type: Date }
}, { timestamps: true });

const ScheduledPost = mongoose.model('ScheduledPost', scheduledPostSchema);
module.exports = ScheduledPost;