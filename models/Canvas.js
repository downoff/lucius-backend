const mongoose = require('mongoose');

// This defines a single "card" on our Kanban board
const cardSchema = new mongoose.Schema({
    content: { type: String, required: true },
    sourceTool: { type: String, required: true }, // e.g., "Social Studio", "Carousel Idea"
}, { timestamps: true });

// This defines a single "column" on our board
const columnSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Raw Ideas", "Drafting", "Scheduled"
    cards: [cardSchema]
});

// This is the main Canvas for each user
const canvasSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true // Each user gets only one canvas
    },
    columns: [columnSchema]
});

const Canvas = mongoose.model('Canvas', canvasSchema);

module.exports = Canvas;