const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  resource: {
    type: String,
    required: true,
    enum: ['users', 'orders', 'returns', 'reports', 'analytics', 'settings', 'uploads', 'shipping']
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'approve', 'export', 'view']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient permission lookups
permissionSchema.index({ resource: 1, action: 1 });

module.exports = mongoose.model('Permission', permissionSchema);
