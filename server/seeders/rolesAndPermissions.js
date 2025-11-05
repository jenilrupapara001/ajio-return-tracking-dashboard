const mongoose = require('mongoose');
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Default permissions for the system
const defaultPermissions = [
  // User management
  { name: 'users:create', description: 'Create new users', resource: 'users', action: 'create' },
  { name: 'users:read', description: 'View user information', resource: 'users', action: 'read' },
  { name: 'users:update', description: 'Update user information', resource: 'users', action: 'update' },
  { name: 'users:delete', description: 'Delete users', resource: 'users', action: 'delete' },
  
  // Order management
  { name: 'orders:create', description: 'Create new orders', resource: 'orders', action: 'create' },
  { name: 'orders:read', description: 'View order information', resource: 'orders', action: 'read' },
  { name: 'orders:update', description: 'Update order information', resource: 'orders', action: 'update' },
  { name: 'orders:delete', description: 'Delete orders', resource: 'orders', action: 'delete' },
  { name: 'orders:approve', description: 'Approve orders', resource: 'orders', action: 'approve' },
  
  // Return management
  { name: 'returns:create', description: 'Create new returns', resource: 'returns', action: 'create' },
  { name: 'returns:read', description: 'View return information', resource: 'returns', action: 'read' },
  { name: 'returns:update', description: 'Update return information', resource: 'returns', action: 'update' },
  { name: 'returns:delete', description: 'Delete returns', resource: 'returns', action: 'delete' },
  { name: 'returns:approve', description: 'Approve returns', resource: 'returns', action: 'approve' },
  
  // Reports and analytics
  { name: 'reports:read', description: 'View reports', resource: 'reports', action: 'read' },
  { name: 'reports:export', description: 'Export reports', resource: 'reports', action: 'export' },
  { name: 'analytics:view', description: 'View analytics', resource: 'analytics', action: 'view' },
  
  // File management
  { name: 'uploads:create', description: 'Upload files', resource: 'uploads', action: 'create' },
  { name: 'uploads:read', description: 'View uploaded files', resource: 'uploads', action: 'read' },
  { name: 'uploads:delete', description: 'Delete uploaded files', resource: 'uploads', action: 'delete' },
  
  // Shipping management
  { name: 'shipping:read', description: 'View shipping information', resource: 'shipping', action: 'read' },
  { name: 'shipping:update', description: 'Update shipping information', resource: 'shipping', action: 'update' },
  
  // Settings
  { name: 'settings:read', description: 'View system settings', resource: 'settings', action: 'read' },
  { name: 'settings:update', description: 'Update system settings', resource: 'settings', action: 'update' }
];

// Default roles with their permissions
const defaultRoles = [
  {
    name: 'admin',
    description: 'Full system access with all permissions',
    level: 10,
    isSystem: true,
    permissions: [] // Will be populated with all permissions
  },
  {
    name: 'manager',
    description: 'Department manager with elevated permissions',
    level: 7,
    isSystem: true,
    permissions: [] // Will be populated with manager-level permissions
  },
  {
    name: 'supervisor',
    description: 'Team supervisor with moderate permissions',
    level: 5,
    isSystem: true,
    permissions: [] // Will be populated with supervisor-level permissions
  },
  {
    name: 'user',
    description: 'Standard user with basic permissions',
    level: 3,
    isSystem: true,
    permissions: [] // Will be populated with basic permissions
  },
  {
    name: 'viewer',
    description: 'Read-only user with minimal permissions',
    level: 1,
    isSystem: true,
    permissions: [] // Will be populated with view-only permissions
  }
];

// Permission mapping for each role
const rolePermissions = {
  admin: ['*'], // All permissions
  manager: [
    'users:read', 'users:update',
    'orders:read', 'orders:update', 'orders:approve',
    'returns:read', 'returns:update', 'returns:approve',
    'reports:read', 'reports:export',
    'analytics:view',
    'uploads:create', 'uploads:read',
    'shipping:read', 'shipping:update',
    'settings:read'
  ],
  supervisor: [
    'orders:read', 'orders:update',
    'returns:read', 'returns:update',
    'reports:read',
    'analytics:view',
    'uploads:create', 'uploads:read',
    'shipping:read'
  ],
  user: [
    'orders:read', 'orders:create',
    'returns:read', 'returns:create',
    'uploads:create', 'uploads:read'
  ],
  viewer: [
    'orders:read',
    'returns:read',
    'uploads:read'
  ]
};

async function seedRolesAndPermissions() {
  try {
    console.log('🌱 Starting roles and permissions seeding...');
    
    // Clear existing data
    await Permission.deleteMany({});
    await Role.deleteMany({});
    
    // Create permissions
    console.log('📝 Creating permissions...');
    const createdPermissions = await Permission.insertMany(defaultPermissions);
    console.log(`✅ Created ${createdPermissions.length} permissions`);
    
    // Create a map of permission names to IDs for easy lookup
    const permissionMap = {};
    createdPermissions.forEach(p => {
      permissionMap[p.name] = p._id;
    });
    
    // Create roles with their permissions
    console.log('👥 Creating roles...');
    for (const roleData of defaultRoles) {
      const permissionNames = rolePermissions[roleData.name];
      let permissionIds = [];
      
      if (permissionNames.includes('*')) {
        // Admin gets all permissions
        permissionIds = createdPermissions.map(p => p._id);
      } else {
        // Map permission names to IDs
        permissionIds = permissionNames
          .map(name => permissionMap[name])
          .filter(id => id); // Remove undefined entries
      }
      
      const role = new Role({
        ...roleData,
        permissions: permissionIds
      });
      
      await role.save();
      console.log(`✅ Created role: ${role.name} with ${permissionIds.length} permissions`);
    }
    
    // Create a default admin user if none exists
    const adminRole = await Role.findOne({ name: 'admin' });
    const existingAdmin = await User.findOne({ email: 'admin@ajio.com' });
    
    if (!existingAdmin && adminRole) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminUser = new User({
        name: 'System Administrator',
        email: 'admin@ajio.com',
        password: hashedPassword,
        role: adminRole._id,
        department: 'IT',
        isActive: true
      });
      
      await adminUser.save();
      console.log('✅ Created default admin user: admin@ajio.com / admin123');
    }
    
    console.log('🎉 Roles and permissions seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Export for use in other files
module.exports = { seedRolesAndPermissions };

// Run if this file is executed directly
if (require.main === module) {
  // Connect to database and run seeder
  const { connectDB } = require('../config/database');
  
  connectDB()
    .then(() => seedRolesAndPermissions())
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
