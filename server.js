// ... (all your existing requires for express, cors, passport, etc.)
const cron = require('node-cron');

// ... (your existing app setup)

// --- THE FREEMIUM ENGINE: AUTOMATED CREDIT REFILL CRON JOB ---
// This will run once every day at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily credit refill job...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
        const usersToRefill = await User.find({
            isPro: false,
            lastCreditRefill: { $lte: thirtyDaysAgo }
        });

        if (usersToRefill.length > 0) {
            console.log(`Found ${usersToRefill.length} free users to refill credits.`);
            for (const user of usersToRefill) {
                user.credits = 10; // Reset to the free tier amount
                user.lastCreditRefill = new Date();
                await user.save();
            }
        } else {
            console.log('No users need a credit refill today.');
        }
    } catch (error) {
        console.error('Error during credit refill cron job:', error);
    }
});

// ... (all your existing API routes and server start logic)