const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const shareSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true, default: () => nanoid(10) },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tool: { type: String, required: true },
  content: { type: Object, required: true }, // e.g., { text, title }
  public: { type: Boolean, default: true },
  watermark: { type: Boolean, default: true },
  views: { type: Number, default: 0 },
}, { timestamps: true });

const Share = mongoose.model('Share', shareSchema);
module.exports = Share;