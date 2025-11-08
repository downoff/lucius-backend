// routes/payments.js
const router = require("express").Router();
const Company = require("../models/Company");
const Stripe = require("stripe");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

function frontendBase() {
  const f =
    process.env.FRONTEND_ORIGIN ||
    (process.env.NODE_ENV === "production"
      ? "https://www.ailucius.com"
      : "http://localhost:5173");
  return f.replace(/\/+$/, "");
}

// Create a Checkout Session (subscribe the company)
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { company_id, price_id } = req.body || {};
    const company =
      (company_id &&
        (await Company.findById(company_id))) ||
      (await Company.findOne({ active: true }).sort({ updatedAt: -1 }));

    if (!company) return res.status(400).json({ message: "no company" });

    const price = price_id || process.env.STRIPE_PRICE_ID;
    if (!price)
      return res
        .status(400)
        .json({ message: "Missing STRIPE_PRICE_ID or price_id" });

    // Ensure customer exists/attach
    let customerId = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: company.company_name || "Lucius Customer",
        email: (company.contact_emails && company.contact_emails[0]) || undefined,
        metadata: { company_id: String(company._id) },
      });
      customerId = customer.id;
      company.stripe_customer_id = customerId;
      await company.save();
    }

    const base = frontendBase();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${base}/success`,
      cancel_url: `${base}/cancel`,
      metadata: { company_id: String(company._id) },
    });

    return res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "checkout error" });
  }
});

// Create a Billing Portal Session
router.post("/create-portal-session", async (req, res) => {
  try {
    const { company_id } = req.body || {};
    const company =
      (company_id &&
        (await Company.findById(company_id))) ||
      (await Company.findOne({ active: true }).sort({ updatedAt: -1 }));
    if (!company) return res.status(400).json({ message: "no company" });
    if (!company.stripe_customer_id)
      return res.status(400).json({ message: "no stripe customer" });

    const base = frontendBase();
    const portal = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${base}/pricing`,
    });

    return res.json({ url: portal.url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "portal error" });
  }
});

module.exports = router;
