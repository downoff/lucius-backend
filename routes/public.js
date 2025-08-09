const express = require('express');
const router = express.Router();
const Share = require('../models/Share');

// This route fetches the data for a public share page
router.get('/share/:shareId', async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId, public: true }).lean();
    if (!share) {
        return res.status(404).json({ message: 'This content is not public or does not exist.' });
    }

    // Increment views without waiting for it to finish
    Share.updateOne({ _id: share._id }, { $inc: { views: 1 } }).catch(()=>{});

    return res.json({ share });
  } catch (err) {
    console.error("Fetch Share Error:", err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ... (your other public routes like the demo, hooks, etc.)

module.exports = router;