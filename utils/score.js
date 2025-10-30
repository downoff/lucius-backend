function scoreTenderForCompany(tender, company) {
  let score = 0;
  const reasons = [];

  const cpvSet = new Set(company.cpv_codes || []);
  const overlap = (tender.cpv_codes || []).filter(c => cpvSet.has(c));
  const cpvPoints = Math.min(10, overlap.length * 5);
  if (cpvPoints > 0) { score += cpvPoints; reasons.push(`CPV overlap x${overlap.length} (+${cpvPoints})`); }

  const text = `${tender.title} ${tender.description_raw}`.toLowerCase();
  const inc = (company.keywords_include || []).filter(k => k && text.includes(k.toLowerCase()));
  const incPoints = Math.min(15, inc.length * 3);
  if (incPoints > 0) { score += incPoints; reasons.push(`Include keywords ${inc.join(', ')} (+${incPoints})`); }

  const exc = (company.keywords_exclude || []).filter(k => k && text.includes(k.toLowerCase()));
  const excPoints = Math.min(12, exc.length * 4);
  if (excPoints > 0) { score -= excPoints; reasons.push(`Exclude keywords ${exc.join(', ')} (-${excPoints})`); }

  const daysLeft = Math.ceil((new Date(tender.deadline_iso) - Date.now()) / 86400000);
  if (!Number.isNaN(daysLeft)) {
    if (daysLeft <= 14) { score += 10; reasons.push('Urgent deadline (<=14d) (+10)'); }
    else if (daysLeft <= 30) { score += 5; reasons.push('Approaching deadline (<=30d) (+5)'); }
  }

  if ((company.countries || []).includes(tender.country)) {
    score += 8;
    reasons.push(`Country match ${tender.country} (+8)`);
  }

  return { score, reasons };
}

module.exports = { scoreTenderForCompany };
