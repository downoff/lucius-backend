const express = require("express");
const router = express.Router();
const { calculateMatchScore } = require("../services/scoring");

// POST /api/scoring/analyze
// Body: { tender: { title, description, budget }, company: { ... } }
// Or simplified: { value, complexity, competitors, ... } for the manual scorer
router.post("/analyze", async (req, res) => {
  try {
    const { value, complexity, competitors, description } = req.body;

    // Construct a pseudo-tender object for the AI scorer
    const tender = {
      title: "Manual Bid Assessment",
      description_raw: description || `Contract Value: ${value}, Complexity: ${complexity}`,
      budget: value
    };

    // Mock company for now (or fetch from DB if authentication implementation allows)
    const company = {
      company_name: "User Company", // In future traverse req.user
      keywords_include: ["general"],
      description: "A capable agency."
    };

    // We can add specific logic for the manual parameters (competitors, complexity)
    // Since the AI scorer is text based, we might want a hybrid approach.
    // For now, let's wrap the AI scorer but refine the score based on manual inputs.

    const aiResult = await calculateMatchScore(tender, company);

    // Manual Modifiers
    let score = aiResult.score;
    let rationales = [aiResult.rationale];

    if (complexity === 'high') {
      score -= 10;
      rationales.push("High complexity reduces win probability without specific niche expertise.");
    }
    if (parseInt(competitors) > 5) {
      score -= 15;
      rationales.push("High number of competitors reduces statistical win chance.");
    }

    // Clamp
    score = Math.max(0, Math.min(99, score));

    res.json({
      score: Math.round(score),
      rationale: rationales.join(" ")
    });

  } catch (err) {
    console.error("Scoring API Error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

module.exports = router;
