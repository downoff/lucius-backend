// routes/admin.js
const router = require("express").Router();
const mongoose = require("mongoose");
const Company = require("../models/Company");
const Tender = require("../models/Tender");

/**
 * GET /api/admin/metrics
 * PROTECTED: In production, add auth middleware. For now/demo, open or secret header.
 */
router.get("/metrics", async (req, res) => {
  try {
    // 1. User/Company Metrics
    const totalCompanies = await Company.countDocuments({ active: true });

    // "Paid" defined as having stripe_id or specific plan
    const paidCompanies = await Company.countDocuments({
      active: true,
      $or: [{ stripe_customer_id: { $ne: null } }, { plan: 'agency' }, { is_paid: true }]
    });

    // 2. Financials (Approximation)
    // MRR = Paid Users * €49
    const mrr = paidCompanies * 49;

    // 3. Activity Metrics
    const totalTenders = await Tender.countDocuments();

    // Recent Signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newSignups = await Company.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Growth Rate (Mock logic for demo if history not available, 
    // or real calculation if we had historical snapshots)
    const growthRate = totalCompanies > 0 ? ((newSignups / totalCompanies) * 100).toFixed(1) : 0;

    return res.json({
      ok: true,
      users: {
        total: totalCompanies,
        paid: paidCompanies,
        new_last_30d: newSignups,
        growth_rate: `${growthRate}%`
      },
      financials: {
        mrr: mrr,
        currency: "EUR",
        arr: mrr * 12
      },
      system: {
        tenders_ingested: totalTenders,
        proposals_generated: await countProposals() // Helper
      }
    });

  } catch (e) {
    console.error("Admin metrics error:", e);
    return res.status(500).json({ message: "Metrics error" });
  }
});

// Helper to sum up proposals (if we don't have a specific global counter)
async function countProposals() {
  try {
    const result = await Company.aggregate([
      { $group: { _id: null, total: { $sum: "$proposals_count" } } }
    ]);
    return result[0]?.total || 0;
  } catch (e) {
    return 0;
  }
}

module.exports = router;
