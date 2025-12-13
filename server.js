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

// --- CORS: Strict Production Configuration ---
const ALLOWED_ORIGINS = [
  "https://www.ailucius.com",
  "https://ailucius.com",
  "http://localhost:5173",
  "http://localhost:5174", // Common alternate dev port
  "https://lucius-frontend.onrender.com" // Render preview if needed
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
  })
);

// Explicit preflight handling
app.options("*", cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

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

// DB Connection with Crash Prevention
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.warn("⚠️  MONGO_URI not set. Skipping DB connection. App will run in limited mode.");
} else {
  mongoose
    .connect(mongoUri, { autoIndex: true })
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.error("MongoDB Connection Error:", err));
}

// Health Check (No DB dependency)
app.get("/api/health-check", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    cors_origin: req.headers.origin,
    env_has_mongo: !!process.env.MONGO_URI
  });
});

// CORS Debug Endpoint
app.get("/api/cors-debug", (req, res) => {
  res.json({ message: "CORS is working if you see this." });
});

// Route Debugger: Dump all registered routes to console on request
app.get("/api/debug-routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) { // routes registered directly on the app
      routes.push(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') { // router middleware 
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const baseUrl = middleware.regexp.source.replace("^\\", "").replace("\\/?(?=\\/|$)", "").replace(/\\\//g, "/");
          routes.push(`${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${baseUrl}${handler.route.path}`);
        }
      });
    }
  });
  console.log("Registered Routes:", routes);
  res.json(routes);
});

// Auto-ingestion on startup (Safe Mode)
const { ingestFromTED } = require("./services/tenderIngestor");

// Root Route for Render Health Check
app.get("/", (req, res) => {
  res.status(200).send("LuciusAI Backend is Running");
});

// Explicitly bind to 0.0.0.0 for Render
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server listening on port ${PORT} (0.0.0.0)`);
  console.log(`[Startup] Strict CORS enabled. MONGO_URI present: ${!!mongoUri}`);

  // Trigger background ingestion only if DB is connected
  // Disabled to prevent startup timeout on Render
  /*
  if (mongoUri) {
    try {
      console.log("Triggering startup tender ingestion...");
      ingestFromTED().catch(err => console.error("Startup ingestion failed:", err));
    } catch (error) {
      console.error("Failed to trigger startup ingestion:", error);
    }
  }
  */
});
