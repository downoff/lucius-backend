// models/Tender.js
const mongoose = require("mongoose");

const TenderSchema = new mongoose.Schema(
  {
    source: String,
    title: String,
    description_raw: String,
    authority: String,
    country: String,
    deadline_iso: String,
    cpv_codes: [String],
    url: String,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Tender || mongoose.model("Tender", TenderSchema);
