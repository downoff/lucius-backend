// middleware/auth.js
// JWT authentication middleware
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || "dev_fallback_secret_change_me";

module.exports = async function (req, res, next) {
  try {
    // Check for token in Authorization header or x-auth-token header
    const token = 
      req.headers.authorization?.replace("Bearer ", "") ||
      req.headers["x-auth-token"] ||
      req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      req.user = null;
      return next(); // Pass through but without user (for optional auth routes)
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email
    };

    next();
  } catch (error) {
    // If token is invalid, just set user to null and continue
    // Some routes might want to handle this differently
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      req.user = null;
      return next();
    }
    
    console.error("[Auth Middleware Error]", error);
    req.user = null;
    next();
  }
};
