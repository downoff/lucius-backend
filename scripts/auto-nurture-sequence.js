const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const OpenAI = require('openai');
const Company = require('../models/Company');
const mongoose = require('mongoose');

console.log('📧 Starting Email Nurture Sequence...');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Email templates for different stages
const EMAIL_SEQUENCES = {
    day_1_welcome: {
        subject: 'Welcome to LuciusAI - Your First Win Starts Here',
        template: (companyName) => `
Hi there,

Welcome to LuciusAI! 🎉

You just joined 2,487 companies using AI to win government tenders faster.

**Here's how to get your first win in 3 steps:**

1. **Pick a Template** → Go to /templates and choose your industry
2. **Upload a Tender** → Try our AI Copilot at /tender-ai
3. **Track Your Win** → Use /success to see your ROI

**Quick Win:** Most users who complete these 3 steps in their first week convert to paid plans.

**Need help?** Reply to this email - I personally read every message.

To your success,
The LuciusAI Team

P.S. Check out our Win Calculator to see your tender odds: /tools/win-calculator
        `
    },
    day_3_case_study: {
        subject: '€200K Tender Won Using LuciusAI (Case Study Inside)',
        template: (companyName) => `
Hi,

Quick case study for you:

**Company:** TechFlow Solutions (IT Consultancy)
**Challenge:** Spending 15 hours per tender, low win rate
**Solution:** Used LuciusAI templates + AI Copilot
**Result:** Won €200K contract, reduced time to 3 hours

**What they did:**
- Started with our IT Consulting template
- Customized with their company profile
- Used compliance checker before submission
- Result: 94% compliance score → Won

**You can do the same:**
→ Start with a template: /templates
→ Use the AI Copilot: /tender-ai

Most customers win their first tender within 30 days of signup.

Questions? Just reply.

Best,
The LuciusAI Team
        `
    },
    day_5_roi_calculator: {
        subject: 'Calculate: How Much Money Are You Leaving on the Table?',
        template: (companyName) => `
Hi,

Quick question: How many tenders did you skip last month because you didn't have time?

**The Math:**
- Average tender value: €150K
- Time to write manually: 12 hours
- Cost per hour: €50
- Manual cost: €600/tender

**With LuciusAI:**
- Time to write: 2 hours
- Cost: €199/month
- You can submit 5x more tenders

**ROI Example:**
If you submit just 2 extra tenders/month, and win 1 → €150K revenue for €199 cost.

That's a 75,000% ROI.

**Ready to stop leaving money on the table?**
→ Upgrade to Pro: /pricing

Still on trial? Use it! You have 4 days left.

Best,
The LuciusAI Team

P.S. See your own ROI projections: /success
        `
    },
    day_7_limited_offer: {
        subject: '⏰ Last Day: 20% Off Annual (Trial Ending)',
        template: (companyName) => `
Hi,

Your trial ends tomorrow.

**Special offer for you:**
→ 20% off annual Pro plan
→ Ends in 24 hours
→ Use code: FIRSTWIN20

**Pro Plan Includes:**
✓ Unlimited AI proposals
✓ 50+ industry templates
✓ Compliance checker
✓ Team collaboration
✓ Priority support
✓ Success metrics dashboard

**Normally:** €199/month
**Your price:** €1,910/year (save €478)

**Upgrade now:** /pricing?code=FIRSTWIN20

Questions? Reply to this email.

To your success,
The LuciusAI Team

P.S. This offer expires with your trial. After tomorrow, it's gone.
        `
    }
};

async function sendNurtureEmails() {
    try {
        // Connect to database
        if (!process.env.MONGO_URI) {
            console.error('❌ MONGO_URI not set');
            return;
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find trial users and their signup dates
        const now = new Date();
        const companies = await Company.find({
            is_paid: false,
            trial_ends_at: { $gte: now } // Still in trial
        });

        console.log(`📊 Found ${companies.length} trial users`);

        for (const company of companies) {
            const signupDate = company.created_at || company.createdAt;
            const daysSinceSignup = Math.floor((now - new Date(signupDate)) / (1000 * 60 * 60 * 24));

            let emailToSend = null;

            // Determine which email to send based on days since signup
            if (daysSinceSignup === 1) {
                emailToSend = EMAIL_SEQUENCES.day_1_welcome;
            } else if (daysSinceSignup === 3) {
                emailToSend = EMAIL_SEQUENCES.day_3_case_study;
            } else if (daysSinceSignup === 5) {
                emailToSend = EMAIL_SEQUENCES.day_5_roi_calculator;
            } else if (daysSinceSignup === 7) {
                emailToSend = EMAIL_SEQUENCES.day_7_limited_offer;
            }

            if (emailToSend) {
                console.log(`\n📧 Sending Day ${daysSinceSignup} email to: ${company.email}`);
                console.log(`Subject: ${emailToSend.subject}`);
                console.log('-------------------------------------------');
                console.log(emailToSend.template(company.name));
                console.log('-------------------------------------------\n');

                // In production, integrate with SendGrid/Mailgun:
                // await sendEmail({
                //   to: company.email,
                //   subject: emailToSend.subject,
                //   body: emailToSend.template(company.name)
                // });
            }
        }

        console.log('✅ Nurture sequence complete');
        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Nurture sequence failed:', error);
    }
}

sendNurtureEmails().catch(console.error);
