const mongoose = require('mongoose');
const winSchema = new mongoose.Schema({
    niche: { type: String, required: true },
    action: { type: String, required: true }, // e.g., "generated a viral campaign idea"
    template: { type: String, required: true }, // The prompt or idea
}, { timestamps: true });
const Win = mongoose.model('Win', winSchema);
module.exports = Win;