// scripts/ensureDemoUser.js
// Ensure demo user exists in the database
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

async function ensureDemoUser() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.warn("⚠️  MONGO_URI not set. Skipping demo user creation.");
      return;
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const email = "demo@ycombinator.com";
    const password = "trylucius2026";

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create demo user
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({
        email,
        password: hashedPassword,
        name: "YC Demo",
        isPro: true,
        credits: 100,
        hasOnboarded: true,
        niche: "General"
      });
      await user.save();
      console.log(`✅ Created demo user: ${email}`);
    } else {
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      user.isPro = true;
      user.credits = 100;
      await user.save();
      console.log(`✅ Verified demo user: ${email}`);
    }

    await mongoose.disconnect();
    console.log("✅ Demo user setup complete");
  } catch (error) {
    console.error("❌ Error ensuring demo user:", error);
    process.exit(1);
  }
}

ensureDemoUser();

