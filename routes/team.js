// routes/team.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Company = require('../models/Company');
const crypto = require('crypto');
const { sendEmail } = require('../services/email'); // Assuming email service exists or we mock it

// Middleware to check if user is admin/owner
const requireAdmin = async (req, res, next) => {
    // In real app, get user from auth middleware (req.user)
    // For now, we'll assume req.body.user_id is passed for testing
    const { user_id } = req.body;
    const user = await User.findById(user_id);

    if (!user || !['owner', 'admin'].includes(user.role)) {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    next();
};

// GET /api/team - Get all team members
router.get('/', async (req, res) => {
    try {
        const { company_id } = req.query;

        if (!company_id) return res.status(400).json({ error: 'Company ID required' });

        const company = await Company.findById(company_id)
            .populate('members', 'name email role last_login');

        if (!company) return res.status(404).json({ error: 'Company not found' });

        res.json({
            members: company.members,
            invites: company.invites
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/team/invite - Invite a new member
router.post('/invite', requireAdmin, async (req, res) => {
    try {
        const { email, role, company_id } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists. Ask them to login.' });
        }

        const company = await Company.findById(company_id);
        if (!company) return res.status(404).json({ error: 'Company not found' });

        // Generate invite token
        const token = crypto.randomBytes(20).toString('hex');
        const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        company.invites.push({ email, role, token, expires_at });
        await company.save();

        // Send invite email (mock)
        console.log(`📧 Sending invite to ${email} with token ${token}`);
        // await sendEmail(email, 'You are invited to join LuciusAI', ...);

        res.json({ message: 'Invite sent successfully', invite: { email, role, token } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/team/accept-invite - Accept invite
router.post('/accept-invite', async (req, res) => {
    try {
        const { token, name, password } = req.body;

        // Find company with this invite
        const company = await Company.findOne({
            'invites.token': token,
            'invites.expires_at': { $gt: new Date() }
        });

        if (!company) return res.status(400).json({ error: 'Invalid or expired invite token' });

        const invite = company.invites.find(i => i.token === token);

        // Create new user
        const newUser = new User({
            email: invite.email,
            name,
            password, // Will be hashed by pre-save hook
            role: invite.role,
            company_id: company._id,
            isPro: true // Inherit pro status from company
        });

        await newUser.save();

        // Add to company members
        company.members.push(newUser._id);
        // Remove invite
        company.invites = company.invites.filter(i => i.token !== token);
        await company.save();

        res.json({ message: 'Welcome to the team!', user: newUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/team/member/:id - Remove member
router.delete('/member/:id', requireAdmin, async (req, res) => {
    try {
        const { company_id } = req.body;
        const memberId = req.params.id;

        const company = await Company.findById(company_id);

        // Remove from company
        company.members = company.members.filter(m => m.toString() !== memberId);
        await company.save();

        // Reset user (or delete, depending on policy)
        await User.findByIdAndUpdate(memberId, { company_id: null, role: 'owner' });

        res.json({ message: 'Member removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
