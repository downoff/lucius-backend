require('dotenv').config();
// ... (all your existing requires: express, cors, mongoose, passport, etc.)
const OpenAI = require('openai');

// ... (your existing app setup and middleware)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// --- FINAL, UPGRADED STREAMING AI ROUTES ---

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
        res.end();
    } catch (error) {
        console.error("Streaming Demo Error:", error);
        res.write(`data: ${JSON.stringify({ error: "An error occurred with the AI." })}\n\n`);
        res.end();
    }
});

// Private Generation Route (Streaming)
app.post('/api/ai/generate', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).end();
        if (!user.isPro && user.credits < 1) return res.status(402).end();

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
        
        // After the stream is complete, save the conversation and subtract credits
        if (!user.isPro) user.credits -= 1;
        const newConversation = new Conversation({
            userId: user._id,
            title: prompt.substring(0, 40) + "...",
            messages: [{ role: 'user', content: prompt }, { role: 'model', content: fullResponse }]
        });
        await Promise.all([user.save(), newConversation.save()]);
        
        res.end();
    } catch (error) {
        console.error("Streaming AI Error:", error);
        res.write(`data: ${JSON.stringify({ error: "A critical error occurred with the AI." })}\n\n`);
        res.end();
    }
});


// ... (all your other routes and server start logic)