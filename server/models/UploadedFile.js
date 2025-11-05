const mongoose = require('mongoose');

const uploadedFileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  reportType: { 
    type: String, 
    enum: ['dropship_order', 'rtv_return', 'unknown'],
    default: 'unknown'
  },
  processed: { type: Boolean, default: false },
  recordsProcessed: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: { type: String },
  filePath: { type: String }
}, {
  timestamps: true
});

// Indexes
uploadedFileSchema.index({ uploadedBy: 1, createdAt: -1 });
uploadedFileSchema.index({ reportType: 1, processed: 1 });

module.exports = mongoose.model('UploadedFile', uploadedFileSchema);