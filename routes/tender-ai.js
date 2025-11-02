// routes/tender-ai.js
const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const Company = require('../models/Company');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Simple paywall guard:
 * For MVP we treat the most recently created company as "current".
 * If there's no company or it's not paid, block the AI draft endpoint.
 */
async function requirePaid(req, res, next) {
  try {
    const company = await Company.findOne().sort({ createdAt: -1 }).lean();
    if (!company || !company.is_paid) {
      return res.status(402).json({ error: 'Payment required' });
    }
    next();
  } catch (e) {
    console.error('requirePaid error', e);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /api/ai-tender/draft
 * Body: { tender: { title, description_raw, authority, country, cpv_codes[], deadline_iso } }
 * Returns: { draft }
 */
router.post('/draft', requirePaid, async (req, res) => {
  try {
    const { tender } = req.body || {};
    if (!tender || !tender.title) {
      return res.status(400).json({ error: 'Missing tender payload (title required)' });
    }

    // Build a strong prompt for a structured first draft
    const prompt = [
      `You are a government tender proposal writer.`,
      `Write a concise, compelling first-draft response for the tender below.`,
      `Return sections: Executive Summary, Our Understanding, Deliverables,`,
      `Approach & Methodology, Timeline, Team, Past Performance, Compliance,`,
      `Pricing (placeholder), Risks & Mitigations.`,
      `Constraints: 600–900 words, plain text (no Markdown tables).`,
      ``,
      `Tender details:`,
      `- Title: ${tender.title}`,
      `- Authority: ${tender.authority || 'n/a'} (${tender.country || 'n/a'})`,
      `- CPV: ${(tender.cpv_codes || []).join(', ') || 'n/a'}`,
      `- Deadline: ${tender.deadline_iso || 'n/a'}`,
      `- Description: ${tender.description_raw ? tender.description_raw.slice(0, 3000) : 'n/a'}`,
    ].join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.4,
      messages: [
        { role: 'system', content: 'You write winning, compliant tender responses with clear structure and no fluff.' },
        { role: 'user', content: prompt },
      ],
    });

    const draft = completion.choices?.[0]?.message?.content || '';
    if (!draft) return res.status(500).json({ error: 'AI returned empty draft' });

    res.json({ draft });
  } catch (e) {
    console.error('AI draft error', e);
    res.status(500).json({ error: 'AI error' });
  }
});

module.exports = router;
