const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  brandName: { type: String, required: true, trim: true, index: true },
  pobIds: { type: [String], default: [], index: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

sellerSchema.index({ name: 1, brandName: 1 }, { unique: true });

module.exports = mongoose.model('Seller', sellerSchema);


