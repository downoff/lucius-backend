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


// --- NEW: CONTINUE CONVERSATION ROUTE ---
app.post('/api/ai/conversation/:id/continue', authMiddleware, async (req, res) => {
    try {
        const { prompt } = req.body;
        const user = await User.findById(req.user.id);

        const conversation = await Conversation.findOne({ 
            _id: req.params.id, 
            userId: req.user.id 
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }

        // Add the user's new prompt to the message history
        conversation.messages.push({ role: 'user', content: prompt });

        // Create the message history for the AI, including the brand voice
        const messagesForAI = [
            { role: "system", content: user.brandVoicePrompt },
            ...conversation.messages.map(msg => ({ role: msg.role, content: msg.content }))
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messagesForAI,
        });

        const aiResponse = completion.choices[0].message.content;

        // Add the AI's new response to the message history
        conversation.messages.push({ role: 'model', content: aiResponse });
        
        await conversation.save(); // Save the updated conversation

        res.json(conversation); // Send the entire updated conversation back

    } catch (error) {
        console.error("Error continuing conversation:", error);
        res.status(500).json({ message: 'Failed to continue conversation.' });
    }
});


// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
