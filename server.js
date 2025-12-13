// server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const sgMail = require("@sendgrid/mail");
const Stripe = require("stripe");
const Company = require("./models/Company");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 10000;

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());

// --- CORS allowlist ---
const DEFAULT_WHITELIST = [
  "https://www.ailucius.com",
  "https://ailucius.com",
  "https://www.aiucius.com", // Typo variant
  "https://aiucius.com",     // Typo variant
  "http://localhost:5173",
  "http://localhost:5174",
  "https://lucius-frontend.onrender.com",
  "https://lucius-backend.onrender.com"
];

const fromEnvSingle = (process.env.FRONTEND_ORIGIN || "").trim();
const fromEnvMany = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Remove duplicates
const ALLOWLIST = Array.from(
  new Set([...DEFAULT_WHITELIST, ...fromEnvMany, fromEnvSingle].filter(Boolean))
);

console.log("[CORS allowlist]", ALLOWLIST);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const ok = ALLOWLIST.includes(origin);
      return cb(ok ? null : new Error(`Not allowed by CORS: ${origin}`), ok);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight with regex (avoid parser edge cases)
app.options(/.*/, cors());

// Stripe webhook BEFORE json()
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed.", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const companyId = session.metadata?.company_id;

        if (companyId) {
          console.log(`[Webhook] Payment success for company ${companyId}`);
          await Company.findByIdAndUpdate(companyId, {
            is_paid: true,
            last_payment_at: new Date(),
            stripe_customer_id: session.customer,
          });
        }
      } else if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        console.log(`[Webhook] Subscription deleted for customer ${customerId}`);
        await Company.findOneAndUpdate(
          { stripe_customer_id: customerId },
          { is_paid: false }
        );
      }

      res.status(200).send({ received: true });
    } catch (err) {
      console.error("Stripe webhook processing error:", err);
      res.status(500).send("Server Error");
    }
  }
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_fallback_secret_change_me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 60 * 60 * 24 * 14, // 14 days
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// DB
if (!process.env.MONGO_URI) {
  console.warn("⚠️  MONGO_URI not set.");
}
mongoose
  .connect(process.env.MONGO_URI, { autoIndex: true })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Health
app.get("/health", (_req, res) =>
  res
    .status(200)
    .json({ status: "ok", message: "Lucius AI backend is healthy." })
);

// Public limiter (stricter)
const publicApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." }
});
app.use("/api/public", publicApiLimiter);

// General API limiter (protects AI endpoints)
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", generalApiLimiter);

// ===== ROUTES (ALL RELATIVE PATHS) =====
app.use("/api/public", require("./routes/marketing"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/company", require("./routes/company"));
app.use("/api/tenders", require("./routes/tenders"));
app.use("/api/ai-tender", require("./routes/tender-ai"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/tender", require("./routes/tender-copilot"));
app.use("/api/referrals", require("./routes/referrals"));
app.use("/api/team", require("./routes/team"));
app.use("/api/enterprise", require("./routes/enterprise"));
app.use("/api/auto-content", require("./routes/auto-content-api"));
app.use("/api/lead-magnet", require("./routes/auto-lead-magnet"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/success", require("./routes/success-metrics"));
app.use("/api/templates", require("./routes/templates"));
app.use("/api/automation", require("./routes/automation-triggers"));
app.use("/api/growth", require("./routes/viral-growth"));
app.use("/api/tools", require("./routes/bid-scorer"));

// Programmatic SEO routes
app.use("/ai-tender-writing", require("./routes/seo-pages"));

// 404
app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));

// Errors
/* eslint-disable no-unused-vars */
app.use((err, req, res, _next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error in ${req.method} ${req.url}:`);
  console.error(err?.stack || err?.message || err);

  res.status(500).json({
    message: "Server error",
    requestId: req.headers['x-request-id'] || Date.now().toString(),
    detail: process.env.NODE_ENV === "production" ? undefined : String(err),
  });
});
/* eslint-enable no-unused-vars */

// Auto-ingestion on startup
const { ingestFromTED } = require("./services/tenderIngestor");
app.listen(PORT, async () => {
  console.log(
    `Server listening at http://localhost:${PORT} or on Render`
  );

  // Trigger background ingestion to ensure fresh data
  try {
    console.log("Triggering startup tender ingestion...");
    // Run in background, don't await blocking the port listen
    ingestFromTED().catch(err => console.error("Startup ingestion failed:", err));
  } catch (error) {
    console.error("Failed to trigger startup ingestion:", error);
  }
});
