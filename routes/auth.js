// routes/auth.js
const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || "dev_fallback_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Login endpoint - OAuth2PasswordRequestForm format (application/x-www-form-urlencoded)
// express.urlencoded() middleware handles this automatically
router.post("/login", async (req, res) => {
  try {
    // Handle FormData (multipart/form-data), form-urlencoded, and JSON
    // Frontend sends FormData with username (email) and password
    const username = req.body.username || req.body.email;
    const password = req.body.password;

    // Log for debugging (remove excessive logging in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log("[Auth Login] Request received:", { 
        username, 
        hasPassword: !!password,
        contentType: req.headers['content-type']
      });
    }

    if (!username || !password) {
      console.log("[Auth Login] Missing credentials:", { 
        username: !!username, 
        password: !!password,
        body: req.body 
      });
      return res.status(400).json({ 
        detail: "Missing email or password" 
      });
    }

    // Find user by email (username is actually email in OAuth2PasswordRequestForm)
    const user = await User.findOne({ email: username });
    
    if (!user) {
      return res.status(400).json({ 
        detail: "Incorrect email or password" 
      });
    }

    // Check if user has a password (OAuth users might not have one)
    if (!user.password) {
      return res.status(400).json({ 
        detail: "This account uses social login. Please sign in with Google." 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(400).json({ 
        detail: "Incorrect email or password" 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id.toString(),
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return token in format expected by frontend
    return res.json({
      access_token: token,
      token_type: "bearer",
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        isPro: user.isPro,
        credits: user.credits,
        hasOnboarded: user.hasOnboarded,
        niche: user.niche
      }
    });
  } catch (error) {
    console.error("[Auth Login Error]", error);
    return res.status(500).json({ 
      detail: "Internal server error" 
    });
  }
});

// Google OAuth routes (placeholder - implement with passport-google-oauth20)
router.get("/google", async (req, res) => {
  // TODO: Implement Google OAuth with passport-google-oauth20
  // For now, return a message
  return res.status(501).json({ 
    message: "Google OAuth not yet implemented. Please use email/password login." 
  });
});

router.get("/google/callback", async (req, res) => {
  // TODO: Handle Google OAuth callback
  return res.status(501).json({ 
    message: "Google OAuth callback not yet implemented." 
  });
});

module.exports = router;

