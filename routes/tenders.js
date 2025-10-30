const express = require('express');
const Tender = require('../models/Tender');
const Company = require('../models/Company');
const { scoreTenderForCompany } = require('../utils/score');
const router = express.Router();

// ✅ Seed mock tenders for testing
router.post('/seed', async (_req, res) => {
  await Tender.deleteMany({ notice_url: '#', source: 'TED' });
  const now = Date.now();
  await Tender.insertMany([
    {
      source: 'TED',
      title: 'Development of municipal web portal with AI chatbot',
      description_raw: 'The City seeks a vendor to build a web portal with AI chat, CMS, accessibility, hosting.',
      cpv_codes: ['72200000','72400000'],
      country: 'HR',
      authority: 'City of Split',
      estimated_value_eur: 120000,
      deadline_iso: new Date(now + 86400000 * 21).toISOString(),
      published_iso: new Date(now).toISOString(),
      document_links: [],
      notice_url: '#',
      lang: 'en',
      status: 'new',
    },
    {
      source: 'TED',
      title: 'Cloud migration and managed support services',
      description_raw: 'Ministry requests cloud migration with managed services, SSO, monitoring, helpdesk.',
      cpv_codes: ['72500000','72600000'],
      country: 'PL',
      authority: 'Ministry of Digital Affairs',
      estimated_value_eur: 300000,
      deadline_iso: new Date(now + 86400000 * 35).toISOString(),
      published_iso: new Date(now).toISOString(),
      document_links: [],
      notice_url: '#',
      lang: 'en',
      status: 'new',
    }
  ]);
  res.json({ ok: true });
});

// ✅ List tenders with scoring (uses last company)
router.get('/', async (_req, res) => {
  const company = await Company.findOne().sort({ createdAt: -1 });
  const tenders = await Tender.find().sort({ createdAt: -1 }).limit(100);

  const list = tenders.map(t => {
    if (company) {
      const { score, reasons } = scoreTenderForCompany(t, company);
      return { ...t.toObject(), relevance_score: score, matched_reasons: reasons };
    }
    return t;
  }).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

  res.json(list);
});

// ✅ Get tender detail
router.get('/:id', async (req, res) => {
  const t = await Tender.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
});

module.exports = router;
