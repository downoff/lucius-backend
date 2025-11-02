// routes/company.js
const express = require('express');
const router = express.Router();
const Company = require('../models/Company'); // <-- import only

/**
 * Create/update a company profile (idempotent-ish).
 */
router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};

    const upsertKey = payload.website?.trim()
      ? { website: payload.website.trim() }
      : payload.company_name?.trim()
      ? { company_name: payload.company_name.trim() }
      : null;

    if (!upsertKey) {
      const created = await Company.create(payload);
      return res.json(created);
    }

    const updated = await Company.findOneAndUpdate(
      upsertKey,
      { $set: payload },
      { new: true, upsert: true }
    );

    return res.json(updated);
  } catch (err) {
    console.error('company POST error:', err);
    return res.status(500).json({ error: 'Failed to save company' });
  }
});

/**
 * Latest company status (used by navbar/pricing).
 */
router.get('/status', async (_req, res) => {
  try {
    const latest = await Company.findOne().sort({ updatedAt: -1, createdAt: -1 }).lean();
    if (!latest) {
      return res.json({ is_paid: false, plan: null, company_id: null });
    }
    return res.json({
      is_paid: !!latest.is_paid,
      plan: latest.plan || null,
      company_id: String(latest._id),
    });
  } catch (err) {
    console.error('company GET /status error:', err);
    return res.status(500).json({ error: 'Failed to get status' });
  }
});

/** (Optional) list all */
router.get('/', async (_req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 }).lean();
    return res.json(companies);
  } catch (err) {
    console.error('company GET / error:', err);
    return res.status(500).json({ error: 'Failed to list companies' });
  }
});

/** (Optional) get one by id */
router.get('/:id', async (req, res) => {
  try {
    const c = await Company.findById(req.params.id).lean();
    if (!c) return res.status(404).json({ error: 'Not found' });
    return res.json(c);
  } catch (err) {
    console.error('company GET /:id error:', err);
    return res.status(500).json({ error: 'Failed to get company' });
  }
});

module.exports = router;
