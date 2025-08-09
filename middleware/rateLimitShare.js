const Share = require('../models/Share');

module.exports = async function rateLimitShare(req, res, next) {
  try {
    if (!req.user || req.user.isPro) return next(); // Pro users bypass limit

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const count = await Share.countDocuments({
      userId: req.user.id,
      createdAt: { $gte: startOfDay }
    });

    const limit = parseInt(process.env.FREE_SHARE_LIMIT_PER_DAY || '5', 10);

    if (count >= limit) {
      return res.status(429).json({ message: 'Daily public share limit reached.' });
    }

    next();
  } catch (err) {
    next(err);
  }
};
