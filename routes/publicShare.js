// routes/publicShare.js
const express = require('express');
const router = express.Router();
const Share = require('../models/Share');

// Public JSON API for shares
router.get('/api/public/share/:shareId', async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId, public: true }).lean();
    if (!share) return res.status(404).json({ message: 'Shared content not found.' });

    // increment views async
    Share.updateOne({ _id: share._id }, { $inc: { views: 1 } }).catch(()=>{});

    return res.json({ share });
  } catch (err) {
    console.error('publicShare fetch error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
