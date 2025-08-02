// ... (all your existing requires for express, cors, passport, etc.)
const rateLimit = require('express-rate-limit');

// ... (your existing app setup)

// --- PUBLIC API ROUTES ---
const publicApiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 15, // Limit each IP to 15 requests per hour for all free tools
    message: { message: 'You have reached the limit for our free tools. Please try again later or sign up for more.' }
});

app.post('/api/public/generate-demo', publicApiLimiter, async (req, res) => { /* ... existing demo code ... */ });
app.post('/api/public/generate-hooks', publicApiLimiter, async (req, res) => { /* ... existing hooks code ... */ });

// --- NEW: AI TONE ANALYZER ROUTE ---
app.post('/api/public/analyze-tone', publicApiLimiter, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Text to analyze is required.' });
        }
        const prompt = `
            Act as a world-class brand strategist. Analyze the following text and describe its brand voice.
            The output must be a valid JSON object with a single key, "analysis".
            The value of "analysis" should be an object with three keys:
            - "tone_summary": A single, descriptive sentence summarizing the overall tone (e.g., "Professional, confident, and authoritative.").
            - "keywords": An array of 5-7 keywords that describe the voice (e.g., ["Formal", "Data-driven", "Inspirational"]).
            - "recommendation": A short recommendation for how this voice could be used effectively in social media.
            The text to analyze is: "${text}"
        `;
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });
        const analysisData = JSON.parse(completion.choices[0].message.content);
        res.json(analysisData);
    } catch (error) {
        console.error("Tone Analysis Error:", error);
        res.status(500).json({ message: "Failed to analyze the text." });
    }
});

// ... (all your existing private, protected API routes)