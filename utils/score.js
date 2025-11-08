// utils/score.js
function normalize(str) {
  return String(str || "").toLowerCase();
}

function scoreTender(t, company) {
  if (!company) return 0;
  let score = 0;

  // Country match
  if (company.countries?.length) {
    if (company.countries.includes(t.country)) score += 20;
  }

  // CPV codes
  if (company.cpv_codes?.length && t.cpv_codes?.length) {
    const overlap = t.cpv_codes.filter(c => company.cpv_codes.includes(c));
    score += overlap.length * 10; // simple
  }

  // Keywords include/exclude
  const text = normalize(`${t.title} ${t.description_raw}`);
  for (const kw of company.keywords_include || []) {
    if (text.includes(normalize(kw))) score += 8;
  }
  for (const kw of company.keywords_exclude || []) {
    if (text.includes(normalize(kw))) score -= 15;
  }

  // Deadline proximity (sooner = better) – simple heuristic
  if (t.deadline_iso) {
    const days =
      (new Date(t.deadline_iso).getTime() - Date.now()) / (1000 * 3600 * 24);
    if (!isNaN(days)) {
      if (days >= 0 && days <= (company.max_deadline_days || 90)) {
        score += Math.max(0, 15 - Math.floor(days / 7)); // up to +15
      } else {
        score -= 5;
      }
    }
  }

  return Math.max(0, Math.round(score));
}

module.exports = { scoreTender };
