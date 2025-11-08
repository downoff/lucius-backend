// server.js
require("dotenv").config();

// --- Core ---
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const MongoStore = require("connect-mongo");
const crypto = require("crypto");

// --- Services ---
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const OpenAI = require("openai");
const sgMail = require("@sendgrid/mail");

// --- Local (only those that are truly needed here) ---
const authMiddleware = require("./middleware/auth");

// --- App ---
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Render/Proxy
app.set("trust proxy", 1);

// --- CORS (strict allowlist) ---
const DEFAULT_WHITELIST = [
  "https://www.ailucius.com",
  "http://localhost:5173",
  "http://localhost:5174",
];

const fromEnvSingle = (process.env.FRONTEND_ORIGIN || "").trim();
const fromEnvMany = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const ALLOWLIST = Array.from(new Set([...DEFAULT_WHITELIST, ...fromEnvMany, fromEnvSingle].filter(Boolean)));
console.log("[CORS allowlist]", ALLOWLIST);

app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWLIST.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
app.options("*", cors());

// --- Stripe webhook BEFORE json() if you add signature verification ---
app.post("/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    // TODO: verify with STRIPE_WEBHOOK_SECRET if you want
    res.status(200).send({ received: true });
  } catch (e) {
    console.error("Stripe webhook error:", e);
    res.status(400).send("Webhook Error");
  }
});

app.use(express.json());

// --- Sessions ---
app.use(session({
  secret: process.env.SESSION_SECRET || "a_very_secret_default_key_for_lucius_final",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// --- DB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// --- Health ---
app.get("/health", (_req, res) => res.status(200).json({ status: "ok", message: "Lucius AI backend is healthy." }));

// --- Passport (minimal Google setup) ---
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    // You can plug your User model here if you need sessions with OAuth
    done(null, { id });
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID || "x",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "x",
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "https://lucius-ai.onrender.com/auth/google/callback",
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      // Attach your real User logic as needed
      return done(null, { id: profile.id, email: profile.emails?.[0]?.value });
    } catch (err) {
      return done(err, null);
    }
  }
));

// --- Public demo limiter (kept from your previous app) ---
const publicApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "You have reached the limit for our free tools." }
});

app.post("/api/public/generate-demo", publicApiLimiter, async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ message: "Prompt is required." });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert social media marketer." },
        { role: "user", content: prompt },
      ]
    });
    res.json({ text: completion.choices?.[0]?.message?.content || "" });
  } catch (e) {
    console.error("Public Demo Error:", e);
    res.status(500).json({ message: "An error occurred with the AI." });
  }
});

// --- ROUTE MOUNTS (all relative paths; NO full URLs here) ---
app.use("/api/company", require("./routes/company"));
app.use("/api/tenders", require("./routes/tenders"));
app.use("/api/ai-tender", require("./routes/tender-ai"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/public", require("./routes/marketing"));
app.use("/api/admin", require("./routes/admin"));

// --- Start ---
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port} or on Render`);
});
