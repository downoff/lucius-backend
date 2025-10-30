const express = require('express');
const Company = require('../models/Company');
const router = express.Router();

// ✅ Create a company
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.company_name) return res.status(400).json({ error: 'company_name required' });
    if (!Array.isArray(b.countries) || !b.countries.length)
      return res.status(400).json({ error: 'countries required' });
    if (!Array.isArray(b.cpv_codes) || !b.cpv_codes.length)
      return res.status(400).json({ error: 'cpv_codes required' });

    const doc = await Company.create({
      company_name: b.company_name,
      website: b.website || '',
      countries: b.countries,
      cpv_codes: b.cpv_codes,
      keywords_include: b.keywords_include || [],
      keywords_exclude: b.keywords_exclude || [],
      max_deadline_days: Math.max(1, Math.min(90, b.max_deadline_days ?? 45)),
      languages: b.languages?.length ? b.languages : ['en'],
      contact_emails: b.contact_emails?.length ? b.contact_emails : [],
    });

    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ✅ List all companies
router.get('/', async (_req, res) => {
  const list = await Company.find().sort({ createdAt: -1 }).limit(50);
  res.json(list);
});

// ✅ Get most recently created company
router.get('/last', async (_req, res) => {
  const last = await Company.findOne().sort({ createdAt: -1 });
  if (!last) return res.status(404).json({ error: 'no companies yet' });
  res.json(last);
});

module.exports = router;
