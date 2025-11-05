const mongoose = require('mongoose');

const trackingLogSchema = new mongoose.Schema({
  awbNumber: { type: String, required: true, index: true },
  courier: { type: String, required: true, index: true },
  status: { type: String },
  originalStatus: { type: String },
  currentLocation: { type: String },
  source: { type: String, enum: ['delhivery', 'shadowfax', 'xpressbees'], index: true },
  response: { type: mongoose.Schema.Types.Mixed },
  linkedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'DropshipOrder' },
  linkedReturnId: { type: mongoose.Schema.Types.ObjectId, ref: 'RtvReturn' }
}, {
  timestamps: true
});

trackingLogSchema.index({ awbNumber: 1, createdAt: -1 });

module.exports = mongoose.model('TrackingLog', trackingLogSchema);


