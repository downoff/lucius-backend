require('dotenv').config();

// --- Core Packages & Modules ---
const express = require('express');
const cors = require('cors');
// ... all other necessary packages and modules

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Final CORS & Middleware Setup ---
// ... (Your full, final CORS and middleware configuration)

// --- Database Connection & Health Check ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- Passport.js & Other Setup ---
// ... (Your full Passport.js configuration)


// --- FINAL, WORLD-CLASS STREAMING ROUTES ---

// Public Demo Route (Streaming)
app.post('/api/public/generate-demo', publicApiLimiter, async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).end();

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: "You are an expert social media marketer." }, { role: "user", content: prompt }],
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
            }
        }
        res.write(`data: ${JSON.stringify({ event: 'close' })}\n\n`);

    } catch (error) {
        console.error("Streaming Demo Error:", error);
        res.write(`data: ${JSON.stringify({ error: "An error occurred with the AI." })}\n\n`);
    }
});

// Private Generation Route (Streaming)
app.post('/api/ai/generate', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).end();
        if (!user.isPro && user.credits < 1) return res.status(402).json({ error: 'You have run out of credits.' });

        const { prompt } = req.body;
        if (!prompt) return res.status(400).end();

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const systemPrompt = user.brandVoicePrompt || "You are an expert social media marketer.";
        
        const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
            stream: true,
        });

        let fullResponse = "";
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                fullResponse += content;
                res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
            }
        }
        
        if (!user.isPro) user.credits -= 1;
        const newConversation = new Conversation({
            userId: user._id,
            title: prompt.substring(0, 40) + "...",
            messages: [{ role: 'user', content: prompt }, { role: 'model', content: fullResponse }]
        });
        await Promise.all([user.save(), newConversation.save()]);
        
        res.write(`data: ${JSON.stringify({ event: 'close' })}\n\n`);

    } catch (error) {
        console.error("Streaming AI Error:", error);
        res.write(`data: ${JSON.stringify({ error: "A critical error occurred." })}\n\n`);
    }
});

// ... (All your other non-streaming routes: auth, billing, history, etc.)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port} or on Render`);
});