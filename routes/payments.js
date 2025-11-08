// routes/payments.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const CompanySchema = new mongoose.Schema({
  company_name: String,
  website: String,
  stripe_customer_id: String,
  billing_status: { type: String, default: "inactive" }
}, { timestamps: true });

const Company = mongoose.models.Company || mongoose.model("Company", CompanySchema);

// Create Checkout Session (subscription)
router.post("/create-checkout-session", async (_req, res) => {
  try {
    const company = await Company.findOne().sort({ updatedAt: -1 });
    if (!company) return res.status(400).json({ message: "no company profile" });

    const customerObj = company.stripe_customer_id ? { customer: company.stripe_customer_id } : {};
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      ...customerObj,
      success_url: `${process.env.FRONTEND_ORIGIN || "https://www.ailucius.com"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_ORIGIN || "https://www.ailucius.com"}/cancel`,
    });

    // if we didn’t have a customer recorded yet, persist it
    if (!company.stripe_customer_id && session.customer) {
      company.stripe_customer_id = typeof session.customer === "string" ? session.customer : session.customer.id;
      await company.save();
    }

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "checkout failed" });
  }
});

// Billing portal
router.post("/create-portal-session", async (_req, res) => {
  try {
    const company = await Company.findOne().sort({ updatedAt: -1 });
    if (!company?.stripe_customer_id) return res.status(400).json({ message: "no stripe customer" });

    const portal = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: process.env.FRONTEND_ORIGIN || "https://www.ailucius.com",
    });

    res.json({ url: portal.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "portal failed" });
  }
});

module.exports = router;
