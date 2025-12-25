// routes/auth.js
const router = require("express").Router();
const multer = require("multer");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || "dev_fallback_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Multer for parsing multipart/form-data (FormData from browser)
const upload = multer();

// Login endpoint - matches frontend expectation (OAuth2PasswordRequestForm format)
// Handle multipart/form-data (FormData), application/x-www-form-urlencoded, and JSON
router.post("/login", upload.none(), async (req, res) => {
  try {
    // Handle FormData (multipart/form-data), form-urlencoded, and JSON
    // Frontend sends FormData with username (email) and password
    const username = req.body.username || req.body.email;
    const password = req.body.password;

    console.log("[Auth Login] Request body:", { 
      username, 
      hasPassword: !!password,
      contentType: req.headers['content-type'],
      bodyKeys: Object.keys(req.body)
    });

    if (!username || !password) {
      console.log("[Auth Login] Missing credentials:", { username: !!username, password: !!password });
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

module.exports = router;

