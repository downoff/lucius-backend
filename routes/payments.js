// routes/payments.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { email } = req.body || {};
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // change to 'subscription' when you create a recurring Price in Stripe
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Lucius Tender Copilot — Starter' },
            unit_amount: 4900, // $49.00 one-time
          },
          quantity: 1,
        },
      ],
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

module.exports = router;
