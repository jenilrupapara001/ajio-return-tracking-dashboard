const User = require('../models/User');

// Middleware to check if user has specific permission
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasPermission = await req.user.hasPermission(resource, action);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Access denied. Required permission: ${resource}:${action}` 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Middleware to check if user has any of the specified permissions
const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      for (const [resource, action] of permissions) {
        const hasPermission = await req.user.hasPermission(resource, action);
        if (hasPermission) {
          return next();
        }
      }

      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Middleware to check if user has all specified permissions
const requireAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      for (const [resource, action] of permissions) {
        const hasPermission = await req.user.hasPermission(resource, action);
        if (!hasPermission) {
          return res.status(403).json({ 
            error: `Access denied. Required permission: ${resource}:${action}` 
          });
        }
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await req.user.populate('role');
    if (!req.user.role || req.user.role.name !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Admin check failed' });
  }
};

// Middleware to check if user is manager or admin
const requireManager = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await req.user.populate('role');
    if (!req.user.role || !['admin', 'manager'].includes(req.user.role.name)) {
      return res.status(403).json({ error: 'Manager access required' });
    }

    next();
  } catch (error) {
    console.error('Manager check error:', error);
    res.status(500).json({ error: 'Manager check failed' });
  }
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireAdmin,
  requireManager
};
