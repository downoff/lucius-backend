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
// ... other initializations

// --- Middleware, DB, and Passport Setup (No Changes) ---
// ... (Full setup code) ...

// --- API ROUTES ---
// ... (Auth, User, AI Generation, History, and Stripe routes - No Changes) ...


// --- NEW: FETCH SINGLE CONVERSATION ROUTE ---
app.get('/api/ai/conversation/:id', authMiddleware, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ 
            _id: req.params.id, 
            userId: req.user.id // Security check to ensure the user owns this conversation
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }
        
        res.json(conversation);

    } catch (error) {
        console.error("Error fetching single conversation:", error);
        res.status(500).json({ message: 'Error fetching conversation.' });
    }
});


// Start Server
// ... (app.listen code) ...