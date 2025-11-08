// models/Subscriber.js
const mongoose = require('mongoose');

const SubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, index: true, required: true },
    source: { type: String, default: 'home' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Subscriber || mongoose.model('Subscriber', SubscriberSchema);
