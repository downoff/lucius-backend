const express = require('express');
const router = express.Router();

// Analytics event tracking endpoint
router.post('/event', async (req, res) => {
    try {
        const { event, category, label, value } = req.body;

        // Log to console (in production, send to analytics service)
        console.log('📊 Analytics Event:', {
            event,
            category,
            label,
            value,
            timestamp: new Date().toISOString(),
            ip: req.ip
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to log event' });
    }
});

// Conversion tracking
router.post('/conversion', async (req, res) => {
    try {
        const { type, plan, amount } = req.body;

        console.log('💰 CONVERSION:', {
            type,
            plan,
            amount,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Conversion tracking error:', error);
        res.status(500).json({ error: 'Failed to log conversion' });
    }
});

module.exports = router;
