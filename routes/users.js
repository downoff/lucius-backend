// routes/users.js
const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || "dev_fallback_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Register endpoint - matches frontend expectation
router.post("/register", async (req, res) => {
  try {
    const { 
      email, 
      password, 
      referralCode, 
      niche,
      // Company profile fields (optional)
      company_name,
      website,
      work_email,
      countries,
      cpv_codes,
      keywords_include,
      keywords_exclude,
      sectors,
      languages,
      team_size,
      tender_volume
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password are required" 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: "The user with this email already exists in the system." 
      });
    }

    // Handle referral code if provided
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    // Create new user (password will be hashed by pre-save middleware)
    const user = new User({
      email,
      password, // Will be hashed by mongoose pre-save hook
      niche: niche || "General",
      referredBy,
      credits: 10, // Default credits
      isPro: false
    });

    await user.save();

    // Create company profile if company data is provided
    let company = null;
    if (company_name) {
      const Company = require("../models/Company");
      
      // Deactivate other companies for this user (if any)
      await Company.updateMany({ owner_id: user._id }, { $set: { active: false } });
      
      // Parse comma-separated strings into arrays
      const parseArray = (str) => str ? str.split(",").map(s => s.trim()).filter(Boolean) : [];
      
      company = new Company({
        company_name,
        website: website || "",
        contact_emails: work_email ? [work_email] : [email],
        contact_email: work_email || email,
        countries: parseArray(countries),
        cpv_codes: parseArray(cpv_codes),
        keywords_include: parseArray(keywords_include),
        keywords_exclude: parseArray(keywords_exclude),
        languages: parseArray(languages),
        team_size: team_size || "",
        tender_volume: tender_volume || "",
        owner_id: user._id,
        active: true
      });
      
      await company.save();
      
      // Link company to user
      user.company_id = company._id;
      await user.save();
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
        hasOnboarded: user.hasOnboarded || !!company, // Mark as onboarded if company created
        niche: user.niche,
        company_id: company ? company._id.toString() : null
      },
      company: company ? {
        id: company._id.toString(),
        company_name: company.company_name
      } : null,
      message: company ? "User and company profile created successfully" : "User registered successfully"
    });
  } catch (error) {
    console.error("[User Register Error]", error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "The user with this email already exists in the system." 
      });
    }

    return res.status(500).json({ 
      message: "Internal server error" 
    });
  }
});

// Get current user endpoint
router.get("/me", authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        message: "Unauthorized" 
      });
    }

    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ 
        message: "User not found" 
      });
    }

    // Return in format expected by frontend
    return res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        isPro: user.isPro,
        credits: user.credits,
        hasOnboarded: user.hasOnboarded,
        niche: user.niche,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    console.error("[User Me Error]", error);
    return res.status(500).json({ 
      message: "Internal server error" 
    });
  }
});

module.exports = router;

