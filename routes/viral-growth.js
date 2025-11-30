const express = require('express');
const router = express.Router();

// Viral sharing mechanic - customers get credits for sharing wins
router.post('/share-win', async (req, res) => {
    try {
        const { userId, tenderValue, tenderTitle, shareType } = req.body;

        // Track sharing behavior
        const User = require('../models/User');
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Award credits for sharing
        const creditsEarned = Math.floor(tenderValue / 10000); // £1 credit per £10K tender
        user.credits = (user.credits || 0) + creditsEarned;

        // Track share type
        user.shares = user.shares || [];
        user.shares.push({
            type: shareType, // 'linkedin', 'twitter', 'email'
            tenderValue,
            tenderTitle,
            timestamp: new Date(),
            creditsEarned
        });

        await user.save();

        // Generate shareable content
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        let sharePrompt = '';
        if (shareType === 'linkedin') {
            sharePrompt = `
Write a LinkedIn post about winning a government tender using AI.

CONTEXT:
- Won: ${tenderTitle}
- Value: £${tenderValue.toLocaleString()}
- Tool used: LuciusAI (AI tender proposal writer)

TONE: Professional, humble brag, insightful

STRUCTURE:
- Hook about the win
- Challenge faced (tender writing complexity)
- Solution (LuciusAI made it easy)
- Result (won the contract)
- CTA: "If you bid on government tenders, check out LuciusAI"

Include relevant hashtags. Keep under 200 words.
`;
        } else if (shareType === 'twitter') {
            sharePrompt = `
Write a Twitter thread (3-5 tweets) about winning a government tender using AI.

Win: ${tenderTitle} (£${tenderValue.toLocaleString()})
Tool: LuciusAI

Make it:
- Attention-grabbing first tweet
- Story in middle tweets
- CTA to try LuciusAI in last tweet
- Use emojis
- Include @LuciusAI mention

Keep each tweet under 280 chars.
`;
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.7,
            messages: [{ role: 'user', content: sharePrompt }],
        });

        const shareContent = completion.choices?.[0]?.message?.content || '';

        res.json({
            success: true,
            creditsEarned,
            totalCredits: user.credits,
            shareContent,
            message: `You earned ${creditsEarned} credits! Share to unlock premium features.`
        });

    } catch (error) {
        console.error('Share win failed:', error);
        res.status(500).json({ error: 'Failed to process share' });
    }
});

// Referral tracking - customers refer colleagues, get rewards
router.post('/track-referral', async (req, res) => {
    try {
        const { referrerId, referredEmail } = req.body;

        const User = require('../models/User');
        const referrer = await User.findById(referrerId);

        if (!referrer) {
            return res.status(404).json({ error: 'Referrer not found' });
        }

        // Track referral
        referrer.referrals = referrer.referrals || [];
        referrer.referrals.push({
            email: referredEmail,
            status: 'pending',
            timestamp: new Date()
        });

        await referrer.save();

        res.json({
            success: true,
            message: 'Referral tracked. You\'ll get 1 month free when they subscribe!',
            totalReferrals: referrer.referrals.length
        });

    } catch (error) {
        console.error('Referral tracking failed:', error);
        res.status(500).json({ error: 'Failed to track referral' });
    }
});

// Achievement system - gamification for retention
router.get('/achievements/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const TenderSubmission = require('../models/TenderSubmission');
        const User = require('../models/User');

        const user = await User.findById(userId);
        const submissions = await TenderSubmission.find({ userId });

        // Calculate achievements
        const achievements = [];

        // First submission
        if (submissions.length >= 1) {
            achievements.push({
                id: 'first_tender',
                name: 'First Tender',
                description: 'Submitted your first tender using LuciusAI',
                icon: '🎯',
                unlocked: true
            });
        }

        // First win
        const wins = submissions.filter(s => s.status === 'won');
        if (wins.length >= 1) {
            achievements.push({
                id: 'first_win',
                name: 'First Victory',
                description: 'Won your first government contract!',
                icon: '🏆',
                unlocked: true
            });
        }

        // High value win
        const bigWins = wins.filter(s => s.value_won > 100000);
        if (bigWins.length >= 1) {
            achievements.push({
                id: 'big_win',
                name: 'Six Figure Win',
                description: 'Won a contract worth over £100K',
                icon: '💰',
                unlocked: true
            });
        }

        // Consistency
        if (submissions.length >= 10) {
            achievements.push({
                id: 'consistent',
                name: 'Tender Machine',
                description: 'Submitted 10+ tenders',
                icon: '🔥',
                unlocked: true
            });
        }

        // Referral master
        if (user.referrals && user.referrals.length >= 3) {
            achievements.push({
                id: 'referral_master',
                name: 'Community Builder',
                description: 'Referred 3+ colleagues to LuciusAI',
                icon: '🌟',
                unlocked: true
            });
        }

        res.json({
            success: true,
            achievements,
            totalUnlocked: achievements.length,
            nextAchievement: getNextAchievement(achievements.length)
        });

    } catch (error) {
        console.error('Achievements fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

function getNextAchievement(current) {
    const next = [
        'Submit 5 more tenders to unlock "Rising Star"',
        'Win 3 contracts to unlock "Triple Threat"',
        'Refer 2 more users to unlock "Ambassador"'
    ];
    return next[Math.floor(Math.random() * next.length)];
}

// Streak tracking - daily engagement
router.get('/streak/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const User = require('../models/User');
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate streak
        const lastActive = user.last_active || new Date();
        const today = new Date();
        const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

        let currentStreak = user.streak || 0;

        if (daysDiff === 0) {
            // Same day, maintain streak
        } else if (daysDiff === 1) {
            // Consecutive day, increment
            currentStreak += 1;
        } else {
            // Broke streak
            currentStreak = 1;
        }

        user.streak = currentStreak;
        user.last_active = today;
        await user.save();

        res.json({
            success: true,
            currentStreak,
            message: currentStreak > 7 ? 'You\'re on fire! 🔥' : 'Keep the streak going!',
            rewardUnlocked: currentStreak === 7 ? '1 week free premium!' : null
        });

    } catch (error) {
        console.error('Streak tracking failed:', error);
        res.status(500).json({ error: 'Failed to track streak' });
    }
});

module.exports = router;
