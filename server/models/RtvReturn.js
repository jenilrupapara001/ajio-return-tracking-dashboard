const mongoose = require('mongoose');

const rtvReturnSchema = new mongoose.Schema({
  returnId: { type: String, required: true, unique: true, index: true },
  orderId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String },
  productName: { type: String, required: true },
  returnReason: { type: String },
  status: { 
    type: String, 
    required: true,
    enum: ['initiated', 'pickup_scheduled', 'in_transit', 'delivered_to_warehouse', 'quality_check', 'refunded', 'replaced', 'rejected'],
    default: 'initiated'
  },
  shippingPartner: { 
    type: String,
    enum: ['DELHIVERY', 'SHADOWFAX', 'XPRESSBEES', 'BLUEDART', 'DTDC', 'ECOM', 'FEDEX']
  },
  trackingNumber: { type: String },
  initiatedDate: { type: Date },
  expectedDelivery: { type: Date },
  refundAmount: { type: Number, default: 0 },
  priority: { 
    type: String, 
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  // Seller info (for filtering/visibility)
  sellerName: { type: String, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', index: true },
  // Persist the full original row and normalized-key row to keep all headers/values
  rawRow: { type: mongoose.Schema.Types.Mixed },
  normalizedRow: { type: mongoose.Schema.Types.Mixed },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date, default: Date.now },
  
  // Tracking Information
  lastTrackingUpdate: { type: Date },
  trackingData: { type: mongoose.Schema.Types.Mixed },
  deliveryStatus: { 
    type: String, 
    enum: ['pending', 'picked_up', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'undelivered', 'rto', 'rto_delivered'],
    default: 'pending'
  },
  currentLocation: { type: String },
  estimatedDeliveryDate: { type: Date },
  actualDeliveryDate: { type: Date },
  // Manual verification snapshot from partner website
  partnerVerifiedStatus: { type: String },
  partnerVerifiedAt: { type: Date },
  partnerVerifiedSource: { type: String },
  partnerVerifiedRaw: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

// Indexes for better performance
rtvReturnSchema.index({ returnId: 1 });
rtvReturnSchema.index({ orderId: 1 });
rtvReturnSchema.index({ status: 1, initiatedDate: -1 });
rtvReturnSchema.index({ shippingPartner: 1 });
rtvReturnSchema.index({ deliveryStatus: 1, lastTrackingUpdate: -1 });
rtvReturnSchema.index({ trackingNumber: 1, deliveryStatus: 1 });

module.exports = mongoose.model('RtvReturn', rtvReturnSchema);