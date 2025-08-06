require('dotenv').config();

// --- Core Packages & Modules ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
// ... all other necessary packages and modules

// --- Local Modules ---
const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Canvas = require('./models/Canvas'); // <-- NEW

// --- App Initialization & Middleware ---
const app = express();
const port = process.env.PORT || 3000;
// ... (Your full CORS, JSON, Session, and Passport setup)

// --- Database Connection & Health Check ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));


// --- PRIVATE (AUTHENTICATED) API ROUTES ---

// ... (All your existing private routes for AI tools, users, billing, etc.)

// --- NEW: LUCIUS CANVAS API ROUTES ---

// Get (or create) the user's canvas
app.get('/api/canvas', authMiddleware, async (req, res) => {
    try {
        let canvas = await Canvas.findOne({ userId: req.user.id });

        // If a user doesn't have a canvas yet, create one for them
        if (!canvas) {
            canvas = new Canvas({
                userId: req.user.id,
                columns: [
                    { name: 'Raw Ideas', cards: [] },
                    { name: 'Drafting', cards: [] },
                    { name: 'Ready to Schedule', cards: [] }
                ]
            });
            await canvas.save();
        }
        res.json(canvas);
    } catch (error) {
        console.error("Error fetching canvas:", error);
        res.status(500).json({ message: 'Failed to get your content canvas.' });
    }
});

// Update the entire canvas (for drag-and-drop)
app.post('/api/canvas/update', authMiddleware, async (req, res) => {
    try {
        const { columns } = req.body;
        const canvas = await Canvas.findOneAndUpdate(
            { userId: req.user.id },
            { columns: columns },
            { new: true } // Return the updated document
        );
        if (!canvas) {
            return res.status(404).json({ message: 'Canvas not found.' });
        }
        res.json(canvas);
    } catch (error) {
        console.error("Error updating canvas:", error);
        res.status(500).json({ message: 'Failed to update your canvas.' });
    }
});


// ... (All your other routes and server start logic)