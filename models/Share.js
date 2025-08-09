// models/Share.js
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const shareSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true, default: () => nanoid(10) },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tool: { type: String, required: true },                 // e.g. "Social Studio"
  content: { type: Object, required: true },              // { text, title, images: [] }
  public: { type: Boolean, default: false },              // opt-in
  watermark: { type: Boolean, default: true },            // forced for free users
  thumbnailUrl: { type: String, default: '' },
  views: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Share', shareSchema);
