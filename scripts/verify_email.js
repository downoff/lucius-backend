const { sendEmail } = require('../services/email');

// Basic test
async function test() {
  console.log("Testing email service...");
  const result = await sendEmail("test@example.com", "Test Subject", "Test Body");
  if (result) {
    console.log("Verification Passed: Email service loaded and executed.");
    process.exit(0);
  } else {
    console.error("Verification Failed: Email service returned false.");
    process.exit(1);
  }
}

test();
