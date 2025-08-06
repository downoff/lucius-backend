require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const OpenAI = require("openai");
const rateLimit = require("express-rate-limit");

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- CORS ---
const whitelist = [
  "https://www.ailucius.com",
  "http://localhost:5173",
  "http://localhost:5174",
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Health check ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// --- Rate limiter ---
const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 5, // 5 requests per minute
  message: { message: "Too many requests, please try again later." },
});

// --- PUBLIC API ROUTE (GET & POST for compatibility) ---
async function handleGenerateDemo(prompt, res) {
  if (!prompt) return res.status(400).json({ message: "Prompt is required." });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert social media marketer." },
        { role: "user", content: prompt },
      ],
    });

    res.json({ text: completion.choices[0].message.content });
  } catch (error) {
    console.error("Public Demo Error:", error);
    res.status(500).json({ message: "An error occurred with the AI." });
  }
}

app.post("/api/public/generate-demo", publicApiLimiter, async (req, res) => {
  await handleGenerateDemo(req.body.prompt, res);
});

app.get("/api/public/generate-demo", publicApiLimiter, async (req, res) => {
  await handleGenerateDemo(req.query.prompt, res);
});

// --- Start server ---
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
