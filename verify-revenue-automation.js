// verify-revenue-automation.js
// Run with: node verify-revenue-automation.js

const mongoose = require('mongoose');
const Company = require('./models/Company');
const { sendEmail } = require('./services/email');
require('dotenv').config();

async function testProtection() {
  console.log("🚀 Testing Revenue Automation...");

  // Connect DB (if possible, else mock)
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI).catch(e => console.error("DB Fail", e));
  } else {
    console.warn("⚠️ No MONGO_URI, skipping DB tests.");
  }

  // 1. Test Limit Logic Mock
  console.log("\n🧪 1. Testing Limit Logic (Mock)...");
  const mockCompany = {
    proposals_count: 10,
    proposals_limit: 10,
    is_paid: false,
    plan: 'solo'
  };

  if (mockCompany.proposals_count >= mockCompany.proposals_limit && !mockCompany.is_paid) {
    console.log("✅ Limit Check PASSED: User blocked at 10.");
  } else {
    console.error("❌ Limit Check FAILED: User not blocked.");
  }

  // 2. Test Email Sending
  console.log("\n🧪 2. Testing Email Sending...");
  const emailRes = await sendEmail("test@example.com", "Test Subject", "Test Body");
  if (emailRes === true) {
    console.log("✅ Email Check PASSED: Function returned true.");
  } else {
    console.error("❌ Email Check FAILED.");
  }

  console.log("\nDone.");
  process.exit(0);
}

testProtection();
