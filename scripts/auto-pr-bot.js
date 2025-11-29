// scripts/auto-pr-bot.js
/**
 * AUTOMATED PR SUBMISSION TO TECH NEWS SITES
 * Submits press releases automatically when you hit milestones
 * 
 * TARGET: TechCrunch, VentureBeat, ProductHunt, BetaList, etc.
 */

const https = require('https');

// Press release templates (triggered automatically)
const PR_TEMPLATES = {
    launch: {
        headline: 'LuciusAI Launches AI Copilot for Government Tender Proposals',
        body: `London, UK - LuciusAI today announced the launch of its AI-powered platform that generates government tender proposals in 5 minutes, reducing what traditionally takes 20-40 hours to mere minutes.

The platform uses OpenAI's GPT-4o to analyze tender requirements and generate compliant, professional proposals tailored to specific industries.

"70% of SMEs never bid on government tenders because the process is too complex and time-consuming," said [Your Name], Founder of LuciusAI. "We're democratizing access to the €800 billion EU procurement market."

Early traction:
- €10,000 MRR in first 30 days
- 50 paying customers across UK, Germany, and France
- 14x LTV:CAC ratio

LuciusAI is available at www.ailucius.com with pricing from €99/month.

For media inquiries: press@ailucius.com`,
        targets: [
            'tips@techcrunch.com',
            'news@venturebeat.com',
            'hello@producthunt.com',
            'submit@betalist.com'
        ]
    },

    funding: {
        headline: 'LuciusAI Raises €2M Seed Round to Scale AI Tender Writing Platform',
        body: `London, UK - LuciusAI announced today it has raised €2 million in seed funding led by [Investor Name] to scale its AI-powered tender proposal platform across Europe.

The funding will be used to:
- Expand to Germany and France markets
- Hire 5 engineers and 2 sales reps
- Scale marketing to acquire 500+ customers

LuciusAI has demonstrated strong product-market fit:
- €50,000 MRR (growing 20% month-over-month)
- 200+ paying customers
- Net revenue retention: 120%

"Government procurement is a massive market that's still run manually," said [Investor Name]. "LuciusAI's AI-first approach can transform how millions of businesses bid on public contracts."

About LuciusAI: AI copilot that generates tender proposals in 5 minutes using GPT-4o. Serving 200+ consultancies across EU and UK.

Contact: press@ailucius.com`,
        targets: [
            'tips@techcrunch.com',
            'news@venturebeat.com',
            'editors@businessinsider.com',
            'news@eu-startups.com'
        ]
    },

    milestone: {
        headline: 'LuciusAI Surpasses €100K MRR, Announces Enterprise Tier',
        body: `London, UK - LuciusAI today announced it has surpassed €100,000 in monthly recurring revenue, just 6 months after launch.

The milestone coincides with the launch of LuciusAI Enterprise, a new tier offering:
- API access for CRM integration
- Custom branding (white-label proposals)
- Dedicated account management
- SSO and advanced security

"We're seeing demand from large consultancies managing 50+ tenders per month," said [Your Name]. "Enterprise tier gives them the automation and customization they need."

Customer testimonial: "LuciusAI saves us €138,000 annually in bid writing costs" - Operations Director, [Customer Name]

LuciusAI Enterprise pricing starts at €499/month.

Learn more: www.ailucius.com/enterprise`,
        targets: [
            'news@venturebeat.com',
            'editorial@saas-mag.com',
            'editors@inc.com'
        ]
    }
};

function sendPR(template) {
    template.targets.forEach((email) => {
        const emailBody = `Subject: ${template.headline}

FOR IMMEDIATE RELEASE

${template.body}

---

Contact:
[Your Name]
Founder, LuciusAI
press@ailucius.com
www.ailucius.com

Press kit: www.ailucius.com/press
Screenshots: www.ailucius.com/press/screenshots
`;

        // Use SendGrid or similar to send
        console.log(`📧 Sending PR to ${email}`);
        console.log(emailBody);

        // In production, use actual email API:
        // sendEmail({ to: email, subject: template.headline, body: template.body });
    });
}

// Auto-detect milestones and send PR
async function autoSendPR() {
    // Query your DB for current metrics
    const mrr = 10000; // Replace with actual: await getMRR();

    // Trigger PR based on milestones
    if (mrr >= 10000 && !sentLaunchPR) {
        sendPR(PR_TEMPLATES.launch);
        sentLaunchPR = true;
    }

    if (mrr >= 100000 && !sentMilestonePR) {
        sendPR(PR_TEMPLATES.milestone);
        sentMilestonePR = true;
    }

    // Add more triggers as needed
}

// Run daily check
setInterval(autoSendPR, 24 * 60 * 60 * 1000);

module.exports = { sendPR, PR_TEMPLATES };
