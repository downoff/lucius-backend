const express = require('express');
const router = express.Router();
const TenderSubmission = require('../models/TenderSubmission');
const Company = require('../models/Company');

// Track tender submission with outcome
router.post('/track-submission', async (req, res) => {
    try {
        const { tenderId, title, value, submittedAt, outcome, wonAt } = req.body;
        const companyId = req.user.company_id;

        const submission = new TenderSubmission({
            company_id: companyId,
            tender_id: tenderId,
            title,
            estimated_value: value,
            submitted_at: submittedAt || new Date(),
            outcome, // 'pending', 'won', 'lost'
            won_at: wonAt
        });

        await submission.save();

        res.json({
            success: true,
            message: 'Tender submission tracked',
            submission
        });
    } catch (error) {
        console.error('Error tracking submission:', error);
        res.status(500).json({ error: 'Failed to track submission' });
    }
});

// Get success metrics for company
router.get('/metrics', async (req, res) => {
    try {
        const companyId = req.user.company_id;

        // Get all submissions
        const submissions = await TenderSubmission.find({ company_id: companyId });

        // Calculate metrics
        const totalSubmitted = submissions.length;
        const won = submissions.filter(s => s.outcome === 'won').length;
        const lost = submissions.filter(s => s.outcome === 'lost').length;
        const pending = submissions.filter(s => s.outcome === 'pending').length;

        const winRate = totalSubmitted > 0 ? (won / (won + lost)) * 100 : 0;

        const totalValue = submissions
            .filter(s => s.outcome === 'won')
            .reduce((sum, s) => sum + (s.estimated_value || 0), 0);

        // Average time saved (assume 8 hours saved per tender with AI)
        const timeSaved = totalSubmitted * 8;

        // Calculate ROI
        const monthlyCost = 199; // Assume Pro plan
        const monthsUsing = 3; // Could be calculated from account creation date
        const totalCost = monthlyCost * monthsUsing;
        const roi = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

        res.json({
            success: true,
            metrics: {
                tenders_submitted: totalSubmitted,
                tenders_won: won,
                tenders_lost: lost,
                tenders_pending: pending,
                win_rate: Math.round(winRate),
                total_value_won: totalValue,
                hours_saved: timeSaved,
                estimated_cost_savings: timeSaved * 50, // €50/hour rate
                roi: Math.round(roi),
                monthly_cost: monthlyCost
            },
            recent_wins: submissions
                .filter(s => s.outcome === 'won')
                .sort((a, b) => new Date(b.won_at) - new Date(a.won_at))
                .slice(0, 5)
                .map(s => ({
                    title: s.title,
                    value: s.estimated_value,
                    won_at: s.won_at
                }))
        });
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// Monthly success report (for customer success emails)
router.get('/monthly-report', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const submissions = await TenderSubmission.find({
            company_id: companyId,
            submitted_at: { $gte: startOfMonth }
        });

        const won = submissions.filter(s => s.outcome === 'won');

        res.json({
            success: true,
            report: {
                month: startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
                submitted_this_month: submissions.length,
                won_this_month: won.length,
                value_won_this_month: won.reduce((sum, s) => sum + (s.estimated_value || 0), 0),
                message: won.length > 0
                    ? `🎉 Congratulations! You won ${won.length} tender(s) worth €${won.reduce((sum, s) => sum + (s.estimated_value || 0), 0).toLocaleString()} this month!`
                    : 'Keep submitting! Success is coming.'
            }
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

module.exports = router;
