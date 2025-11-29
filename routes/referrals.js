// routes/referrals.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const mongoose = require("mongoose");

// Lazy models
const Company = mongoose.models.Company || require("../models/Company");

/**
 * GET /api/referrals/code
 * Get the user's referral code (generate if doesn't exist)
 */
router.get("/code", async (req, res) => {
    try {
        // In a real app, you'd get company_id from session/auth
        const companyId = req.query.company_id;
        if (!companyId) {
            return res.status(400).json({ message: "company_id required" });
        }

        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }

        // Generate referral code if doesn't exist
        if (!company.referral_code) {
            company.referral_code = crypto.randomBytes(4).toString("hex").toUpperCase();
            await company.save();
        }

        const referralLink = `https://www.ailucius.com?ref=${company.referral_code}`;

        res.json({
            referral_code: company.referral_code,
            referral_link: referralLink,
            referrals_count: company.referrals_count || 0,
            referral_credits: company.referral_credits || 0,
        });
    } catch (err) {
        console.error("Get referral code error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * POST /api/referrals/track
 * Track a referral signup (called when new user signs up with ref code)
 */
router.post("/track", async (req, res) => {
    try {
        const { referral_code, new_company_id } = req.body;

        if (!referral_code || !new_company_id) {
            return res.status(400).json({ message: "referral_code and new_company_id required" });
        }

        // Find the referrer
        const referrer = await Company.findOne({ referral_code });
        if (!referrer) {
            return res.status(404).json({ message: "Invalid referral code" });
        }

        // Find the new user
        const newCompany = await Company.findById(new_company_id);
        if (!newCompany) {
            return res.status(404).json({ message: "New company not found" });
        }

        // Prevent self-referral
        if (referrer._id.toString() === new_company_id) {
            return res.status(400).json({ message: "Cannot refer yourself" });
        }

        // Award credits to both (€50 each)
        referrer.referral_credits = (referrer.referral_credits || 0) + 50;
        referrer.referrals_count = (referrer.referrals_count || 0) + 1;
        await referrer.save();

        newCompany.referral_credits = (newCompany.referral_credits || 0) + 50;
        newCompany.referred_by = referral_code;
        await newCompany.save();

        res.json({
            message: "Referral tracked! Both parties received €50 credits.",
            referrer_credits: referrer.referral_credits,
            new_user_credits: newCompany.referral_credits,
        });
    } catch (err) {
        console.error("Track referral error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/referrals/stats
 * Get referral leaderboard (top referrers)
 */
router.get("/stats", async (req, res) => {
    try {
        const topReferrers = await Company.find({ referrals_count: { $gt: 0 } })
            .select("company_name referrals_count referral_credits")
            .sort({ referrals_count: -1 })
            .limit(10);

        res.json({ leaderboard: topReferrers });
    } catch (err) {
        console.error("Get referral stats error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
