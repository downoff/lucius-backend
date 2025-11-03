// routes/drafts.js
const express = require('express');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const Company = require('../models/Company');
const Tender = require('../models/Tender');
const mongoose = require('mongoose');
const sgMail = require('@sendgrid/mail');

const router = express.Router();

// Configure SendGrid if key present
if (process.env.SENDGRID_API_KEY) {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } catch (e) {
    console.warn('[drafts] Failed to set SendGrid key:', e?.message);
  }
}

// --- Schema (inline) for saved drafts ---
const DraftSchema = new mongoose.Schema({
  tender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', index: true },
  tender_title: String,
  body: String,                 // the draft text
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Draft = mongoose.models.Draft || mongoose.model('Draft', DraftSchema);

// --- Save latest draft ---
router.post('/', async (req, res) => {
  try {
    const { tender_id, tender_title, body } = req.body || {};
    if (!tender_id || !body) return res.status(400).json({ message: 'tender_id and body are required' });

    const draft = new Draft({ tender_id, tender_title, body });
    await draft.save();
    res.json({ ok: true, id: draft._id });
  } catch (e) {
    console.error('[drafts] save error:', e);
    res.status(500).json({ message: 'Failed to save draft' });
  }
});

// --- Load latest draft by tender ---
router.get('/:tenderId', async (req, res) => {
  try {
    const { tenderId } = req.params;
    const latest = await Draft.findOne({ tender_id: tenderId }).sort({ createdAt: -1 });
    res.json(latest || null);
  } catch (e) {
    console.error('[drafts] get latest error:', e);
    res.status(500).json({ message: 'Failed to load draft' });
  }
});

// --- List history for a tender ---
router.get('/:tenderId/history', async (req, res) => {
  try {
    const { tenderId } = req.params;
    const items = await Draft.find({ tender_id: tenderId }).sort({ createdAt: -1 }).limit(25);
    res.json(items);
  } catch (e) {
    console.error('[drafts] history error:', e);
    res.status(500).json({ message: 'Failed to list history' });
  }
});

// --- Export .docx ---
router.get('/:tenderId/export-docx', async (req, res) => {
  try {
    const { tenderId } = req.params;

    const tender = await Tender.findById(tenderId).lean();
    const draft = await Draft.findOne({ tender_id: tenderId }).sort({ createdAt: -1 }).lean();

    if (!draft) {
      return res.status(404).json({ message: 'No draft found to export' });
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: tender?.title || 'Proposal Draft',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: `${tender?.authority || ''} • ${tender?.country || ''} • Deadline: ${tender?.deadline_iso ? new Date(tender.deadline_iso).toLocaleDateString() : 'n/a'}`,
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({
                  text: (draft.body || '').replace(/\r?\n/g, '\n'),
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const suggestName = `${(tender?.title || 'proposal')
      .replace(/[^a-z0-9]+/gi, '-')
      .slice(0, 60)}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${suggestName}"`);
    return res.send(buffer);
  } catch (e) {
    console.error('[drafts] export-docx error:', e);
    res.status(500).json({ message: 'Failed to export DOCX' });
  }
});

// --- Email draft to company contact_emails ---
router.post('/:tenderId/email', async (req, res) => {
  try {
    const { tenderId } = req.params;

    const company = await Company.findOne().sort({ updatedAt: -1, createdAt: -1 }).lean();
    if (!company) return res.status(400).json({ message: 'Company profile not found' });

    if (!Array.isArray(company.contact_emails) || company.contact_emails.length === 0) {
      return res.status(400).json({ message: 'No contact_emails set on company' });
    }

    const tender = await Tender.findById(tenderId).lean();
    const draft = await Draft.findOne({ tender_id: tenderId }).sort({ createdAt: -1 }).lean();
    if (!draft) return res.status(404).json({ message: 'No draft found to email' });

    if (!process.env.SENDGRID_API_KEY || !process.env.SEND_FROM_EMAIL) {
      return res.status(400).json({ message: 'SendGrid not configured (SENDGRID_API_KEY, SEND_FROM_EMAIL)' });
    }

    const subject = `Draft: ${tender?.title || 'Proposal'}`;
    const text = `Hi,

Attached is the latest AI-generated draft for the tender:

Title: ${tender?.title || '-'}
Authority: ${tender?.authority || '-'}
Country: ${tender?.country || '-'}
Deadline: ${tender?.deadline_iso ? new Date(tender.deadline_iso).toLocaleDateString() : 'n/a'}

--- Draft ---
${draft.body}

Best,
Lucius Tender Copilot
`;

    // Optional: attach the DOCX too
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: tender?.title || 'Proposal Draft', heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: '' }),
            new Paragraph({ children: [new TextRun({ text: draft.body || '' })] }),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    const base64Doc = buffer.toString('base64');
    const filename = `${(tender?.title || 'proposal').replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}.docx`;

    const msg = {
      to: company.contact_emails,
      from: process.env.SEND_FROM_EMAIL,
      subject,
      text,
      attachments: [
        {
          content: base64Doc,
          filename,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          disposition: 'attachment',
        },
      ],
    };

    await sgMail.send(msg);
    res.json({ ok: true, sent_to: company.contact_emails });
  } catch (e) {
    console.error('[drafts] email error:', e?.response?.body || e);
    res.status(500).json({ message: 'Failed to email draft' });
  }
});

module.exports = router;
