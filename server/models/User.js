const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  customPermissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  department: {
    type: String,
    default: 'Operations'
  },
  phone: {
    type: String,
    default: ''
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  subordinates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user has a specific permission
userSchema.methods.hasPermission = async function(resource, action) {
  await this.populate('role');
  await this.populate('customPermissions');
  
  // Check custom permissions first (override role permissions)
  const customPermission = this.customPermissions.find(p => 
    p.resource === resource && p.action === action && p.isActive
  );
  
  if (customPermission) return true;
  
  // Check role permissions
  if (this.role && this.role.isActive) {
    await this.role.populate('permissions');
    return this.role.permissions.some(p => 
      p.resource === resource && p.action === action && p.isActive
    );
  }
  
  return false;
};

// Method to get all user permissions
userSchema.methods.getAllPermissions = async function() {
  await this.populate('role');
  await this.populate('customPermissions');
  
  const permissions = new Set();
  
  // Add custom permissions
  this.customPermissions.forEach(p => {
    if (p.isActive) {
      permissions.add(`${p.resource}:${p.action}`);
    }
  });
  
  // Add role permissions
  if (this.role && this.role.isActive) {
    await this.role.populate('permissions');
    this.role.permissions.forEach(p => {
      if (p.isActive) {
        permissions.add(`${p.resource}:${p.action}`);
      }
    });
  }
  
  return Array.from(permissions);
};

module.exports = mongoose.model('User', userSchema);