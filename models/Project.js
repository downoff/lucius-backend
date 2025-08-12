const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    goal: { type: String, required: true },
    status: { type: String, enum: ['active', 'complete'], default: 'active' },
    generatedContent: [{
        tool: String,
        output: Object,
    }]
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;