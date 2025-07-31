require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
// ... all other package requires

const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const Conversation = require('./models/Conversation');
// ... other model requires

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Middleware, DB, and Passport Setup (No Changes) ---
// ... (Full setup code) ...

// --- API ROUTES ---
// ... (All existing Auth, AI, History, and Stripe routes - No Changes) ...


// --- NEW: CENTRALIZED CONTENT HUB ROUTE ---
app.get('/api/content-hub', authMiddleware, async (req, res) => {
    try {
        // In the future, we can fetch images, carousels, etc. here as well.
        // For now, we start with the core content: conversations.
        const conversations = await Conversation.find({ userId: req.user.id })
            .sort({ updatedAt: -1 }) // Sort by the most recently updated
            .limit(50); // Limit to the last 50 items for performance

        // We will format the data to be easily used by the frontend hub
        const contentFeed = conversations.map(conv => ({
            id: conv._id,
            type: 'Conversation',
            title: conv.title,
            preview: conv.messages.length > 1 ? conv.messages[1].content.substring(0, 100) + '...' : '...',
            updatedAt: conv.updatedAt,
        }));
        
        res.json(contentFeed);

    } catch (error) {
        console.error("Error fetching content hub feed:", error);
        res.status(500).json({ message: 'Error fetching your content feed.' });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
