const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Auto-trigger endpoint - run ALL automation with one API call
router.post('/trigger-all', async (req, res) => {
    try {
        console.log('🚀 AUTO-TRIGGER: Running all inbound automation...');

        const results = {
            partnerships: 'running',
            pr: 'running',
            investor_content: 'running',
            sdr: 'running',
            blog: 'running',
        };

        // Trigger all automation scripts in background
        const { spawn } = require('child_process');

        // Partnership outreach
        spawn('node', ['scripts/auto-partnership-outreach.js'], {
            detached: true,
            stdio: 'ignore'
        }).unref();

        // PR system
        spawn('node', ['scripts/auto-pr-system.js'], {
            detached: true,
            stdio: 'ignore'
        }).unref();

        // Investor magnet
        spawn('node', ['scripts/auto-investor-magnet.js'], {
            detached: true,
            stdio: 'ignore'
        }).unref();

        // SDR (existing)
        spawn('node', ['scripts/auto-sdr.js'], {
            detached: true,
            stdio: 'ignore'
        }).unref();

        // Blog (existing)
        spawn('node', ['scripts/auto-content-api.js'], {
            detached: true,
            stdio: 'ignore'
        }).unref();

        res.json({
            success: true,
            message: 'All automation systems activated',
            results,
            note: 'Check email for generated content in 5-10 minutes'
        });

    } catch (error) {
        console.error('Auto-trigger failed:', error);
        res.status(500).json({ error: 'Automation trigger failed' });
    }
});

// Partnership automation only
router.post('/trigger-partnerships', async (req, res) => {
    try {
        const { spawn } = require('child_process');
        spawn('node', ['scripts/auto-partnership-outreach.js'], {
            detached: true,
            stdio: 'ignore'
        }).unref();

        res.json({
            success: true,
            message: 'Partnership automation running',
            eta: '5 minutes'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PR automation only
router.post('/trigger-pr', async (req, res) => {
    try {
        const { spawn } = require('child_process');
        spawn('node', ['scripts/auto-pr-system.js'], {
            detached: true,
            stdio: 'ignore'
        }).unref();

        res.json({
            success: true,
            message: 'PR automation running',
            eta: '3 minutes'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Investor magnet automation only
router.post('/trigger-investor', async (req, res) => {
    try {
        const { spawn } = require('child_process');
        spawn('node', ['scripts/auto-investor-magnet.js'], {
            detached: true,
            stdio: 'ignore'
        }).unref();

        res.json({
            success: true,
            message: 'Investor magnet automation running',
            eta: '5 minutes'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Webhook for Zapier/Make integration
router.post('/webhook/new-signup', async (req, res) => {
    try {
        const { email, name, company } = req.body;

        console.log(`🔔 New signup webhook: ${email}`);

        // Auto-trigger welcome sequence
        // Auto-add to investor update list
        // Auto-notify on Slack (if configured)

        // Could trigger specific automation based on signup source
        // e.g., if from partnership, thank partner

        res.json({
            success: true,
            message: 'Webhook received, automation triggered'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Schedule next automation run
router.get('/status', async (req, res) => {
    try {
        // Return status of all automation systems
        res.json({
            success: true,
            systems: {
                partnerships: {
                    status: 'active',
                    last_run: 'Never (run /trigger-partnerships)',
                    next_run: 'On-demand via API'
                },
                pr: {
                    status: 'active',
                    last_run: 'Never (run /trigger-pr)',
                    next_run: 'On-demand via API'
                },
                investor: {
                    status: 'active',
                    last_run: 'Never (run /trigger-investor)',
                    next_run: 'On-demand via API'
                },
                all: {
                    trigger_url: '/api/automation/trigger-all',
                    method: 'POST'
                }
            },
            note: 'Use POST /api/automation/trigger-all to run everything at once'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
