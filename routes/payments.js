// routes/payments.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Company = require('../models/Company');

// Create one-time checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { email, company_id } = req.body || {};

    let companyIdToAttach = company_id;
    if (!companyIdToAttach && email) {
      const company = await Company.findOne({ contact_emails: { $in: [email] } }).select('_id');
      if (company) companyIdToAttach = String(company._id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Lucius Tender Copilot — Starter' },
            unit_amount: 4900,
          },
          quantity: 1,
        },
      ],
      metadata: {
        company_id: companyIdToAttach || '',
        product: 'tender-copilot-starter',
      },
      success_url: 'https://www.ailucius.com/success',
      cancel_url: 'https://www.ailucius.com/cancel',
      invoice_creation: { enabled: true },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe create-checkout-session error:', err);
    return res.status(500).json({ error: 'Unable to create checkout session' });
  }
});

// Create a Stripe Billing Portal session
router.post('/create-portal-session', async (req, res) => {
  try {
    const { company_id } = req.body || {};
    let company = null;

    if (company_id) {
      company = await Company.findById(company_id);
    } else {
      company = await Company.findOne().sort({ createdAt: -1 });
    }

    if (!company || !company.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found for company' });
    }

    const returnUrl = process.env.PORTAL_RETURN_URL || 'https://www.ailucius.com/';
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: returnUrl,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    return res.status(500).json({ error: 'Unable to create portal session' });
  }
});

module.exports = router;
