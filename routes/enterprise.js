// routes/enterprise.js
const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const crypto = require('crypto');

// Middleware to check if user is admin/owner (mocked for now)
const requireAdmin = async (req, res, next) => {
    // In real app, get user from auth middleware
    next();
};

// GET /api/enterprise/settings
router.get('/settings', requireAdmin, async (req, res) => {
    try {
        const { company_id } = req.query;
        if (!company_id) return res.status(400).json({ error: 'Company ID required' });

        const company = await Company.findById(company_id);
        if (!company) return res.status(404).json({ error: 'Company not found' });

        res.json({
            branding: company.branding,
            api_key: company.api_key ? 'sk_live_...' + company.api_key.slice(-4) : null, // Mask key
            has_sso: false // Mock
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/enterprise/branding
router.put('/branding', requireAdmin, async (req, res) => {
    try {
        const { company_id, logo_url, primary_color } = req.body;

        await Company.findByIdAndUpdate(company_id, {
            branding: { logo_url, primary_color }
        });

        res.json({ message: 'Branding updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/enterprise/api-key
router.post('/api-key', requireAdmin, async (req, res) => {
    try {
        const { company_id } = req.body;

        // Generate new key
        const newKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');

        const company = await Company.findByIdAndUpdate(company_id, {
            api_key: newKey
        }, { new: true });

        // Return FULL key only once
        res.json({ api_key: newKey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
