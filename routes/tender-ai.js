const express = require('express');
const OpenAI = require('openai');
const router = express.Router();

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ✅ AI Summary Endpoint
router.post('/summary', async (req, res) => {
  const { tender } = req.body || {};
  if (!tender) return res.status(400).json({ error: 'tender required' });

  // Stub mode (no API key)
  if (!client) {
    return res.json({
      summary: [
        `Purpose: ${tender.title}`,
        `Budget: ~€${tender.estimated_value_eur ?? 'n/a'}`,
        `Deadline: ${tender.deadline_iso || 'n/a'}`,
        `Key requirements: see description`,
        `Eligibility: standard registration + references`
      ].join('\n'),
    });
  }

  const system = 'You summarize public procurement tenders for busy SME executives. Be concise and factual.';
  const user = `Summarize the tender below in 5 bullets: purpose, estimated value/budget, deadline (ISO if present), key requirements, and eligibility/compliance notes. Avoid marketing language.\n\nTENDER:\n${tender.title}\n${tender.description_raw}`;

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: 0.2,
  });

  res.json({ summary: resp.choices?.[0]?.message?.content || '' });
});

// ✅ AI Draft Endpoint
router.post('/draft', async (req, res) => {
  const { tender, company_profile, industry = 'IT services' } = req.body || {};
  if (!tender) return res.status(400).json({ error: 'tender required' });

  if (!client) {
    return res.json({
      draft: `Introduction: We are a small ${industry} company.\nUnderstanding: ${tender.title}\nApproach: ...\nTimeline: 8–12 weeks\nCompliance: GDPR; references available.\nClosing: Thank you.`,
    });
  }

  const system = 'You write first-draft proposal outlines for SMEs responding to public tenders. Be structured, polite, and specific. Do not invent facts.';
  const user = `Write a 1-page outline response to this tender for a small ${industry} company.
Sections: Introduction, Understanding of Requirements, Proposed Approach, Team & Experience, Timeline, Compliance & Certifications (list items), Closing.

Company highlights (if provided):
${JSON.stringify(company_profile || {}, null, 2)}

TENDER:
${tender.title}
${tender.description_raw}`;

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: 0.3,
  });

  res.json({ draft: resp.choices?.[0]?.message?.content || '' });
});

module.exports = router;
