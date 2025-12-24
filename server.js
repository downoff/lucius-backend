// server.js
// Refactored with strict 4-block architecture: Global Middleware -> API Routes -> API Firewall -> Frontend Serving
// Architecture ensures all /api/* routes return JSON only, preventing HTML responses for failed API calls
require("dotenv").config();

const express = require("express");
const path = require("path");
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

// Initialize Stripe
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn("⚠️  STRIPE_SECRET_KEY not set. Payments will fail.");
  stripe = {
    webhooks: { constructEvent: () => { throw new Error("Stripe not configured"); } }
  };
}

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================================
// BLOCK 0: Pre-Middleware Routes (Health Check, Webhooks)
// ============================================================================
// These routes must be defined before middleware that might interfere

// Root Health Check - Returns JSON status
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Render Health Check - Must be top-level to bypass middleware dependencies
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Stripe webhook - MUST be before express.json() middleware
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

// ============================================================================
// BLOCK 1: Global Middleware (CORS, JSON parsing, Body limits, Security)
// ============================================================================

app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());

// --- CORS: Strict Production Configuration ---
const ALLOWED_ORIGINS = [
  "https://www.ailucius.com",
  "https://ailucius.com",
  "http://localhost:5173",
  "http://localhost:5174", // Common alternate dev port
  "https://lucius-frontend.onrender.com", // Render preview if needed
  "https://lucius-ai.onrender.com", // Render backend URL (for same-origin requests)
  process.env.FRONTEND_URL // Allow dynamic frontend URL from env
].filter(Boolean); // Remove any undefined values

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In development (localhost), allow all
      if (process.env.NODE_ENV !== 'production' || origin.includes('localhost')) {
        return callback(null, true);
      }

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

// --- Body Parsing with Increased Limits for PDF Uploads ---
// Increased to 50mb to handle large PDF files
// Body parsing with increased limits for PDF uploads (50mb)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Session Configuration ---
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "dev_fallback_secret_change_me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
};

if (process.env.MONGO_URI) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 60 * 60 * 24 * 14, // 14 days
  });
} else {
  console.warn("⚠️  MONGO_URI not set. Using MemoryStore for sessions (not persistent).");
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.warn("⚠️  MONGO_URI not set. Skipping DB connection. App will run in limited mode.");
} else {
  mongoose
    .connect(mongoUri, { 
      autoIndex: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    })
    .then(() => {
      console.log("✅ MongoDB Connected");
      // Start queue worker after MongoDB is connected
      startQueueWorker();
    })
    .catch((err) => {
      console.error("❌ MongoDB Connection Error:", err.message);
      // Don't crash the server - it can still serve static files and some API routes
      console.warn("⚠️  Server will continue without database. Some features will be unavailable.");
    });
  
  // Handle MongoDB connection events
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Queue worker will pause until reconnection.');
  });
  
  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });
}

// ============================================================================
// BLOCK 2: API Routes (All Backend Logic)
// ============================================================================
// All /api/* routes MUST be defined here, before the API Firewall
// This ensures API routes are processed before static file serving

// --- Inline API Routes ---
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

// --- API Router Mounts (all /api/* routes) ---
app.use("/api/company", require("./routes/company"));
app.use("/api/tenders", require("./routes/tenders"));
app.use("/api/viral", require("./routes/viral-growth"));
app.use("/api/public", require("./routes/public")); // New PSEO Module
app.use("/api/admin", require("./routes/admin")); // Phase 3: Investor Readiness
app.use("/api/payments", require("./routes/payments"));
app.use("/api/scoring", require("./routes/scoring"));
app.use("/api/upload", require("./routes/upload")); // PDF Upload Route - Explicitly defined

// Admin Trigger for Ingestion (Temporary/Dev)
app.post("/api/admin/ingest", async (req, res) => {
  // Basic protection (optional, for now open in dev)
  // if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) return res.status(403).json({ error: "Unauthorized" });

  const { ingestFromTED } = require("./services/tenderIngestor");
  console.log("Manual ingestion triggered...");

  // Run in background
  ingestFromTED().catch(err => console.error("Ingestion failed:", err));

  res.json({ message: "Ingestion started in background" });
});

// ============================================================================
// BLOCK 3: API Firewall (404 Handler for /api/* routes)
// ============================================================================
// CRITICAL: This MUST be placed after all API routes but BEFORE static file serving
// It ensures all unmatched /api/* requests return JSON, never HTML
// This prevents the frontend from receiving HTML when an API call fails

app.use("/api", (req, res) => {
  // If we reach here, no API route matched
  res.status(404).json({ 
    error: "API Endpoint Not Found",
    path: req.path,
    method: req.method
  });
});

// ============================================================================
// BLOCK 4: Frontend Serving (React Static Files & SPA Routing)
// ============================================================================
// Only serve static files AFTER all API routes and API firewall are defined
// This ensures API requests are never intercepted by static file serving

// Determine frontend build directory
// In production, serve from relative path to frontend dist
// In development, this might not exist, so we check for it
const frontendDistPath = path.join(__dirname, '../lucius-frontend-1/dist');
const fs = require('fs');

if (fs.existsSync(frontendDistPath)) {
  // Serve static files from React build directory
  app.use(express.static(frontendDistPath, {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true
  }));

  // SPA Fallback: Serve index.html for all non-API routes
  // This allows React Router to handle client-side routing
  app.get('*', (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    } else {
      // This should never happen due to API firewall, but safety check
      res.status(404).json({ error: "API Endpoint Not Found" });
    }
  });

  console.log("✅ [Startup] Frontend static files enabled from:", frontendDistPath);
} else {
  console.warn("⚠️  [Startup] Frontend dist directory not found:", frontendDistPath);
  console.warn("⚠️  [Startup] Running in API-only mode (no frontend serving)");
  
  // Fallback: Still provide a catch-all for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.status(404).json({ 
        error: "Frontend not available",
        message: "Frontend build directory not found. Running in API-only mode."
      });
    } else {
      res.status(404).json({ error: "API Endpoint Not Found" });
    }
  });
}

// ============================================================================
// Startup: Queue Worker & Server Initialization
// ============================================================================

// Start Queue Worker Function (called after MongoDB connects)
function startQueueWorker() {
  try {
    // Try BullMQ Worker first (if Redis is available)
    if (process.env.REDIS_URL) {
      try {
        require("./workers/pdfProcessor");
        console.log("✅ [Startup] PDF Processor Worker started (BullMQ)");
      } catch (bullError) {
        console.warn("⚠️  [Startup] BullMQ worker failed, using simple queueWorker:", bullError.message);
      }
    } else {
      console.log("⚠️  [Startup] REDIS_URL not set, using simple queueWorker");
    }
    
    // Always start the simple queueWorker (works without Redis, polls database)
    const { startWorker } = require("./services/queueWorker");
    startWorker(1000); // Poll every 1 second
    console.log("✅ [Startup] Simple Queue Worker started (Database polling)");
  } catch (e) {
    console.error("❌ [Startup] Failed to start Queue Worker:", e.message);
  }
}

// Start Server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server listening on port ${PORT} (0.0.0.0)`);
  console.log(`[Startup] Strict CORS enabled. MONGO_URI present: ${!!mongoUri}`);
  console.log(`[Startup] API Firewall: All /api/* routes return JSON only`);

  // ✅ AUTO-INGESTION ENABLED - Real tender data fetching
  console.log("🚀 [Startup] Auto-ingestion ENABLED. Triggering background tender fetch...");

  try {
    const { ingestFromTED } = require("./services/tenderIngestor");

    // Run in background, don't block server startup
    setImmediate(() => {
      ingestFromTED()
        .then(() => console.log("✅ [Startup] Initial tender ingestion complete"))
        .catch(err => console.error("❌ [Startup] Ingestion failed:", err.message));
    });
  } catch (requireErr) {
    console.warn("⚠️ [Startup] Could not load ingestion module:", requireErr.message);
    console.warn("⚠️ [Startup] Server will continue without auto-ingestion.");
  }
});
