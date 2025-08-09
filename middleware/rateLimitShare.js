const Share = require('../models/Share');

module.exports = async function rateLimitShare(req, res, next) {
  try {
    // This assumes your auth middleware has already attached the user to req.user
    if (!req.user || req.user.isPro) {
        return next(); // Don't rate limit Pro users
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const count = await Share.countDocuments({
      userId: req.user.id,
      createdAt: { $gte: today }
    });

    const limit = parseInt(process.env.FREE_SHARE_LIMIT_PER_DAY || '5', 10);

    if (count >= limit) {
      return res.status(429).json({ message: 'Daily share limit reached. Upgrade for unlimited public shares.'});
    }

    next();
  } catch (err) {
    console.error("Rate limit error:", err);
    next(err);
  }
};