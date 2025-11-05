const mongoose = require('mongoose');

const dropshipOrderSchema = new mongoose.Schema({
  // Basic Order Information
  custOrderNo: { type: String, required: true, index: true },
  custOrderDate: { type: Date },
  fwdSellerOrderNo: { type: String, index: true },
  fwdPoNo: { type: String },
  fwdPoDate: { type: Date },
  
  // Invoice Information
  sellerInvoiceNo: { type: String },
  sellerInvoiceDate: { type: Date },
  custInvoiceNo: { type: String },
  custInvoiceDate: { type: Date },
  
  // Status and Business Logic
  status: { type: String, required: true, index: true },
  jioCode: { type: String },
  hsn: { type: String },
  
  // Product Information
  sellerStyleCode: { type: String },
  sellerSku: { type: String },
  ean: { type: String },
  description: { type: String },
  brand: { type: String },
  
  // Quantity Information
  orderQty: { type: Number, default: 0 },
  shippedQty: { type: Number, default: 0 },
  cancelledQty: { type: Number, default: 0 },
  customerCancelledQty: { type: Number, default: 0 },
  sellerCancelledQty: { type: Number, default: 0 },
  
  // Shipping Information
  fwdShipmentId: { type: String },
  fwdShipmentDate: { type: Date },
  fwdCarrier: { type: String, index: true },
  fwdAwb: { type: String, index: true },
  estimatedDispatchDate: { type: Date },
  slaStatus: { type: String },
  
  // Financial Information
  listingMrp: { type: Number, default: 0 },
  sellerTd: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  basePrice: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  
  // Tax Information
  cgstPercentage: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstPercentage: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstPercentage: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  
  // Total Values
  totalValue: { type: Number, default: 0 },
  invoiceValue: { type: Number, default: 0 },
  
  // Business Information
  fulfillmentType: { type: String },
  pobId: { type: String },
  sellerName: { type: String },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', index: true },
  
  // Complex Business Logic Fields
  isPreInvoiceCancellation: { type: Boolean, default: false },
  isPostInvoiceCancellation: { type: Boolean, default: false },
  hasInvoiceDetails: { type: Boolean, default: false },
  
  // Processing Information
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
  
  // Enhanced Tracking Information
  trackingHistory: [{
    timestamp: { type: Date },
    status: { type: String },
    location: { type: String },
    remarks: { type: String },
    source: { type: String, default: 'delhivery' }
  }],
  trackingSource: { type: String, default: 'delhivery' },
  trackingLastChecked: { type: Date },
  trackingError: { type: String },
  isTrackingActive: { type: Boolean, default: true }
  ,
  // Manual verification snapshot from partner website
  partnerVerifiedStatus: { type: String },
  partnerVerifiedAt: { type: Date },
  partnerVerifiedSource: { type: String },
  partnerVerifiedRaw: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

// Indexes for better performance
dropshipOrderSchema.index({ custOrderNo: 1, jioCode: 1 });
dropshipOrderSchema.index({ fwdAwb: 1, fwdCarrier: 1 });
dropshipOrderSchema.index({ status: 1, custOrderDate: -1 });
dropshipOrderSchema.index({ isPreInvoiceCancellation: 1, isPostInvoiceCancellation: 1 });
dropshipOrderSchema.index({ seller: 1 });
dropshipOrderSchema.index({ deliveryStatus: 1, lastTrackingUpdate: -1 });
dropshipOrderSchema.index({ fwdAwb: 1, deliveryStatus: 1 });

module.exports = mongoose.model('DropshipOrder', dropshipOrderSchema);