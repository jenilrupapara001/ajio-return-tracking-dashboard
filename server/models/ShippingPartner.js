const mongoose = require('mongoose');

const shippingPartnerSchema = new mongoose.Schema({
  partnerCode: { type: String, required: true, unique: true },
  partnerName: { type: String, required: true },
  apiEndpoint: { type: String },
  apiKey: { type: String },
  isActive: { type: Boolean, default: true },
  trackingUrlTemplate: { type: String },
  supportedServices: [{ type: String }],
  performanceMetrics: {
    totalOrders: { type: Number, default: 0 },
    deliveredOrders: { type: Number, default: 0 },
    averageDeliveryTime: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ShippingPartner', shippingPartnerSchema);