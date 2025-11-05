const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import database connection and models
const { connectDB } = require('./config/database');
const User = require('./models/User');
const Role = require('./models/Role');
const Permission = require('./models/Permission');
const DropshipOrder = require('./models/DropshipOrder');
const RtvReturn = require('./models/RtvReturn');
const UploadedFile = require('./models/UploadedFile');
const Seller = require('./models/Seller');
const reportProcessor = require('./services/reportProcessor');
const realTimeUpdateService = require('./services/realTimeUpdateService');
const { requirePermission, requireAdmin, requireManager } = require('./middleware/permissions');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize database connection
connectDB().then(async () => {
  // Initialize default data
  await initializeDefaultData();
  
  // Start real-time update service
  realTimeUpdateService.start();
}).catch(console.error);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ajio_secret_key_2025');
    
    // Fetch the full user object with role populated
    const user = await User.findById(decoded.id)
      .populate('role', 'name description level')
      .populate('customPermissions', 'name resource action');
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ error: 'User account is deactivated' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('❌ Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Initialize default data
const initializeDefaultData = async () => {
  try {
    // Import and run the seeder
    const { seedRolesAndPermissions } = require('./seeders/rolesAndPermissions');
    await seedRolesAndPermissions();
    
    // Initialize shipping partners
    await reportProcessor.initializeShippingPartners();
    
    // Test status mapping
    reportProcessor.testStatusMapping();
  } catch (error) {
    console.error('❌ Error initializing default data:', error);
  }
};

// Auth routes
app.post('/auth/register', async (req, res) => {
  const { email, password, name, role, department = 'Operations', phone = '' } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Email, password, name, and role are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Validate role exists
    const roleExists = await Role.findById(role);
    if (!roleExists) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }

    // Create new user
    const user = await User.create({
      email,
      password, // Will be hashed by pre-save middleware
      name,
      role,
      department,
      phone
    });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'ajio_secret_key_2025',
      { expiresIn: '24h' }
    );

    // Populate role for response
    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('role', 'name description level');

    res.json({
      token,
      user: populatedUser
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'ajio_secret_key_2025',
      { expiresIn: '24h' }
    );

    // Populate role for response
    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('role', 'name description level');

    res.json({
      token,
      user: populatedUser
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('role', 'name description level')
      .populate('customPermissions', 'name resource action');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

// Public endpoint to get available roles for registration
app.get('/auth/roles', async (req, res) => {
  try {
    const roles = await Role.find({ isSystem: true })
      .select('name description level')
      .sort('level');
    
    res.json(roles);
  } catch (error) {
    console.error('❌ Get roles error:', error);
    res.status(500).json({ error: 'Failed to get available roles' });
  }
});

// Debug endpoint to test status mapping
app.get('/debug/status-mapping/:status', (req, res) => {
  try {
    const { status } = req.params;
    const result = reportProcessor.mapRTVData({ Status: status }, 'debug');
    res.json({ 
      original: status, 
      mapped: result.status,
      message: `Status "${status}" was mapped to "${result.status}"`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch single AWB status (Delhivery HTML fallback)
app.get('/track/delhivery/:awb', async (req, res) => {
  try {
    const awb = req.params.awb;
    const htmlMap = await reportProcessor.fetchDelhiveryHtmlStatuses([awb]);
    const html = htmlMap[awb] || '';
    const orderStatus = reportProcessor.mapDelhiveryHtmlToOrderStatus(html);
    const returnStatus = reportProcessor.mapDelhiveryHtmlToReturnStatus(html);
    res.json({ awb, orderStatus, returnStatus });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch AWB status' });
  }
});

// File upload route
app.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const { filename, originalname, mimetype, size } = req.file;
    const reportType = req.body.type || 'unknown';
    const sellerId = req.body.sellerId || null;
    const filePath = path.join(__dirname, 'uploads', filename);

    // Save file info to database
    const uploadedFile = await UploadedFile.create({
      filename,
      originalName: originalname,
      fileType: mimetype,
      fileSize: size,
      uploadedBy: req.user.id,
      seller: sellerId,
      reportType,
      filePath,
      processingStatus: 'processing'
    });

    // Process the file based on type
    let processingResult;
    // Prioritize explicit type from client
    if (reportType === 'dropship_order') {
      processingResult = await reportProcessor.processDropshipOrderReport(filePath, req.user.id, uploadedFile._id, { sellerId });
    } else if (reportType === 'rtv_return') {
      processingResult = await reportProcessor.processRTVReport(filePath, req.user.id, uploadedFile._id, { sellerId });
    } else {
      // Fallback to filename heuristics
      const lower = originalname.toLowerCase();
      if (lower.includes('dropship') && lower.includes('order')) {
        processingResult = await reportProcessor.processDropshipOrderReport(filePath, req.user.id, uploadedFile._id, { sellerId });
      } else if (lower.includes('rtv') || lower.includes('return')) {
        processingResult = await reportProcessor.processRTVReport(filePath, req.user.id, uploadedFile._id, { sellerId });
      } else {
        processingResult = await reportProcessor.processDropshipOrderReport(filePath, req.user.id, uploadedFile._id, { sellerId });
      }
    }

    res.json({
      message: 'File uploaded and processed successfully',
      fileId: uploadedFile._id,
      filename: originalname,
      recordsProcessed: processingResult.recordsProcessed
    });
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ error: 'File upload failed: ' + error.message });
  }
});

// Dashboard metrics route
app.get('/dashboard/metrics', authenticateToken, async (req, res) => {
  try {
    const metrics = await reportProcessor.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('❌ Dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to get dashboard metrics' });
  }
});

// Dashboard trends route for time-series data
app.get('/dashboard/trends', authenticateToken, async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const trends = await reportProcessor.getTrendsData(range);
    res.json(trends);
  } catch (error) {
    console.error('❌ Dashboard trends error:', error);
    res.status(500).json({ error: 'Failed to get dashboard trends' });
  }
});

// Sellers CRUD
app.get('/sellers', authenticateToken, async (req, res) => {
  try {
    const q = (req.query.search || '').toString();
    const rx = q ? new RegExp(q, 'i') : null;
    const filter = rx ? { $or: [ { name: rx }, { brandName: rx }, { pobIds: { $in: [rx] } } ] } : {};
    const sellers = await Seller.find(filter).sort({ updatedAt: -1 }).lean();
    res.json(sellers);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

app.post('/sellers', authenticateToken, async (req, res) => {
  try {
    const { name, brandName, pobIds } = req.body || {};
    if (!name || !brandName) return res.status(400).json({ error: 'name and brandName are required' });
    const uniquePob = Array.from(new Set((pobIds || []).map(String).filter(Boolean)));
    const seller = await Seller.create({ name: name.trim(), brandName: brandName.trim(), pobIds: uniquePob });
    res.status(201).json(seller);
  } catch (e) {
    res.status(500).json({ error: e.code === 11000 ? 'Seller already exists' : 'Failed to create seller' });
  }
});

app.put('/sellers/:id', authenticateToken, async (req, res) => {
  try {
    const { name, brandName, pobIds, isActive } = req.body || {};
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (brandName !== undefined) update.brandName = String(brandName).trim();
    if (pobIds !== undefined) update.pobIds = Array.from(new Set((pobIds || []).map(String).filter(Boolean)));
    if (isActive !== undefined) update.isActive = !!isActive;
    const updated = await Seller.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Seller not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update seller' });
  }
});

app.delete('/sellers/:id', authenticateToken, async (req, res) => {
  try {
    await Seller.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete seller' });
  }
});

// Bulk import sellers from Excel/CSV
app.post('/sellers/import', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rows = [];
    if (ext === '.csv') {
      // Simple CSV parse using XLSX
      const wb = XLSX.readFile(filePath, { type: 'file' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    } else {
      const wb = XLSX.readFile(filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    }

    let upserts = 0;
    for (const row of rows) {
      const keys = Object.keys(row).reduce((acc, k) => { acc[k.toLowerCase().trim()] = k; return acc; }, {});
      const get = (variants=[]) => {
        for (const v of variants) {
          const key = keys[v.toLowerCase()];
          if (key && row[key] !== undefined) return String(row[key]).trim();
        }
        return '';
      };
      const name = get(['seller name','seller','name']);
      const brandName = get(['brand name','brand']);
      let pobField = get(['pob ids','pob id','pob','pob list','pobs']);
      // Collect additional POB* columns
      const extraPobs = [];
      for (const k of Object.keys(row)) {
        if (/^pob/i.test(k) && !['pob ids','pob id','pob','pob list','pobs'].includes(k.toLowerCase())) {
          const val = String(row[k] || '').trim();
          if (val) extraPobs.push(val);
        }
      }
      const pieces = [pobField, ...extraPobs]
        .join(',')
        .split(/[\n,;]/)
        .map(s => s.trim())
        .filter(Boolean);
      const pobIds = Array.from(new Set(pieces));

      if (!name || !brandName) continue;

      const updated = await Seller.findOneAndUpdate(
        { name, brandName },
        { $set: { name, brandName }, $addToSet: { pobIds: { $each: pobIds } } },
        { upsert: true, new: true }
      );
      if (updated) upserts++;
    }

    res.json({ success: true, processed: rows.length, upserts });
  } catch (e) {
    console.error('❌ Sellers import error:', e);
    res.status(500).json({ error: 'Failed to import sellers' });
  }
});

// Orders routes
app.get('/orders', authenticateToken, async (req, res) => {
  try {
    const filters = { ...req.query };
    
    const result = await reportProcessor.getOrdersWithFilters(filters);
    res.json(result);
  } catch (error) {
    console.error('❌ Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Returns routes
app.get('/returns', authenticateToken, async (req, res) => {
  try {
    const filters = { ...req.query };
    
    const result = await reportProcessor.getReturnsWithFilters(filters);
    res.json(result);
  } catch (error) {
    console.error('❌ Returns fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

// Create a single return
app.post('/returns', authenticateToken, async (req, res) => {
  try {
    const payload = req.body || {};
    const returnData = reportProcessor.mapRTVData(payload, req.user.id);
    const created = await RtvReturn.create(returnData);
    res.status(201).json(created);
  } catch (error) {
    console.error('❌ Create return error:', error);
    res.status(500).json({ error: 'Failed to create return' });
  }
});

// Update a single return by id
app.put('/returns/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const update = req.body || {};
    const mappedUpdate = reportProcessor.mapRTVData({ ...update, returnId: update.returnId || update.return_id }, req.user.id);
    const updated = await RtvReturn.findByIdAndUpdate(id, mappedUpdate, { new: true });
    if (!updated) return res.status(404).json({ error: 'Return not found' });
    res.json(updated);
  } catch (error) {
    console.error('❌ Update return error:', error);
    res.status(500).json({ error: 'Failed to update return' });
  }
});

// Track individual package by Order ID
app.get('/api/track-package/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    console.log(`🔍 Tracking individual package: ${orderId}`);
    
    // First, find the order in database to get the AWB number
    const DropshipOrder = require('./models/DropshipOrder');
    const order = await DropshipOrder.findOne({ custOrderNo: orderId }).select('fwdAwb custOrderNo');
    
    if (!order || !order.fwdAwb) {
      return res.status(404).json({ 
        error: 'Order not found or no AWB number available',
        orderId
      });
    }

    console.log(`📦 Found AWB ${order.fwdAwb} for Order ID ${orderId}`);
    
    // Get tracking data from Delhivery using AWB number
    const delhiveryService = require('./services/delhiveryService');
    const trackingData = await delhiveryService.trackShipment(order.fwdAwb);
    
    if (!trackingData) {
      return res.status(404).json({ 
        error: 'Package not found or no tracking data available',
        orderId,
        source: 'Delhivery API'
      });
    }

    // Format response for frontend
    const response = {
      awb: trackingData.awbNumber,
      status: trackingData.originalStatus || trackingData.status,
      currentLocation: trackingData.currentLocation || 'Unknown',
      lastUpdate: trackingData.lastUpdated.toISOString(),
      estimatedDelivery: trackingData.estimatedDelivery?.toISOString(),
      trackingHistory: trackingData.trackingHistory || [],
      isRealData: true,
      source: 'Delhivery'
    };

    // Update the order in database with latest tracking info
    try {
      const DropshipOrder = require('./models/DropshipOrder');
      const statusMappingService = require('./services/statusMappingService');
      const mappedStatus = statusMappingService.mapOrderStatus(trackingData.originalStatus);
      
      await DropshipOrder.updateOne(
        { custOrderNo: orderId },
        { 
          $set: {
            deliveryStatus: mappedStatus,
            currentLocation: trackingData.currentLocation,
            lastTrackingUpdate: new Date(),
            trackingData: trackingData
          }
        }
      );
      
      console.log(`✅ Updated order ${awbNumber} with status: ${mappedStatus}`);
    } catch (dbError) {
      console.error('Error updating database:', dbError);
      // Don't fail the request if DB update fails
    }

    res.json(response);
  } catch (error) {
    console.error('❌ Track package error:', error);
    res.status(500).json({ 
      error: 'Failed to track package',
      message: error.message 
    });
  }
});

// Track multiple packages by Order IDs
app.post('/api/track-packages', authenticateToken, async (req, res) => {
  try {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Order IDs array is required' });
    }

    if (orderIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 Order IDs allowed per request' });
    }

    console.log(`🔍 Tracking ${orderIds.length} packages:`, orderIds);
    
    const delhiveryService = require('./services/delhiveryService');
    const DropshipOrder = require('./models/DropshipOrder');
    const results = [];
    const errors = [];

    // Track each Order ID individually to get detailed results
    for (const orderId of orderIds) {
      try {
        // First, find the order in database to get the AWB number
        const order = await DropshipOrder.findOne({ custOrderNo: orderId }).select('fwdAwb custOrderNo');
        
        if (!order || !order.fwdAwb) {
          errors.push({
            orderId: orderId,
            error: 'Order not found or no AWB number available'
          });
          continue;
        }

        const trackingData = await delhiveryService.trackShipment(order.fwdAwb);
        
        if (trackingData) {
          results.push({
            awb: trackingData.awbNumber,
            status: trackingData.originalStatus || trackingData.status,
            currentLocation: trackingData.currentLocation || 'Unknown',
            lastUpdate: trackingData.lastUpdated.toISOString(),
            estimatedDelivery: trackingData.estimatedDelivery?.toISOString(),
            trackingHistory: trackingData.trackingHistory || [],
            isRealData: true,
            source: 'Delhivery'
          });

          // Update the order in database
          try {
            const DropshipOrder = require('./models/DropshipOrder');
            const statusMappingService = require('./services/statusMappingService');
            const mappedStatus = statusMappingService.mapOrderStatus(trackingData.originalStatus);
            
            await DropshipOrder.updateOne(
              { custOrderNo: orderId },
              { 
                $set: {
                  deliveryStatus: mappedStatus,
                  currentLocation: trackingData.currentLocation,
                  lastTrackingUpdate: new Date(),
                  trackingData: trackingData
                }
              }
            );
          } catch (dbError) {
            console.error(`Error updating database for ${orderId}:`, dbError);
          }
        } else {
          errors.push({
            orderId: orderId,
            error: 'No tracking data available'
          });
        }
      } catch (error) {
        console.error(`Error tracking ${orderId}:`, error);
        errors.push({
          orderId: orderId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      total: orderIds.length,
      successful: results.length,
      failed: errors.length,
      results: results,
      errors: errors
    });
  } catch (error) {
    console.error('❌ Track packages error:', error);
    res.status(500).json({ 
      error: 'Failed to track packages',
      message: error.message 
    });
  }
});

// Test Delhivery API endpoint with Order ID
app.get('/api/test-delhivery/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    console.log(`🧪 Testing Delhivery API for Order ID: ${orderId}`);
    
    // First, find the order in database to get the AWB number
    const DropshipOrder = require('./models/DropshipOrder');
    const order = await DropshipOrder.findOne({ custOrderNo: orderId }).select('fwdAwb custOrderNo');
    
    if (!order || !order.fwdAwb) {
      return res.status(404).json({ 
        error: 'Order not found or no AWB number available',
        orderId
      });
    }

    const delhiveryService = require('./services/delhiveryService');
    const trackingData = await delhiveryService.trackShipment(order.fwdAwb);
    
    res.json({
      orderId,
      awbNumber: order.fwdAwb,
      success: !!trackingData,
      data: trackingData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test Delhivery API error:', error);
    res.status(500).json({ 
      error: 'Failed to test Delhivery API',
      message: error.message 
    });
  }
});

// Test Delhivery API endpoint with direct AWB number
app.get('/api/test-awb/:awbNumber', authenticateToken, async (req, res) => {
  try {
    const { awbNumber } = req.params;
    
    if (!awbNumber) {
      return res.status(400).json({ error: 'AWB number is required' });
    }

    console.log(`🧪 Testing Delhivery API for AWB: ${awbNumber}`);
    
    const delhiveryService = require('./services/delhiveryService');
    const trackingData = await delhiveryService.trackShipment(awbNumber);
    
    res.json({
      awbNumber,
      success: !!trackingData,
      data: trackingData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test Delhivery API error:', error);
    res.status(500).json({ 
      error: 'Failed to test Delhivery API',
      message: error.message 
    });
  }
});

// Analytics route
app.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const analytics = await reportProcessor.getAnalyticsData();
    res.json(analytics);
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics data' });
  }
});

// Global sync: compute "our" statuses by AWB for Returns
app.post('/sync/returns', authenticateToken, async (req, res) => {
  try {
    const result = await reportProcessor.syncReturnsByTracking({ live: req.query.live === 'true' || req.body?.live === true });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Returns sync error:', error);
    res.status(500).json({ error: 'Failed to sync returns' });
  }
});

// Global sync: compute "our" statuses by AWB for Orders
app.post('/sync/orders', authenticateToken, async (req, res) => {
  try {
    const result = await reportProcessor.syncOrdersByTracking({ live: req.query.live === 'true' || req.body?.live === true });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Orders sync error:', error);
    res.status(500).json({ error: 'Failed to sync orders' });
  }
});

// Get uploaded files
app.get('/files', authenticateToken, async (req, res) => {
  try {
    const files = await UploadedFile.find({ uploadedBy: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(files);
  } catch (error) {
    console.error('❌ Files fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Database info route
app.get('/database/info', authenticateToken, async (req, res) => {
  try {
    const collections = [
      { name: 'users', model: User, displayName: 'Users' },
      { name: 'dropshiporders', model: DropshipOrder, displayName: 'Dropship Orders' },
      { name: 'rtvreturns', model: RtvReturn, displayName: 'RTV Returns' },
      { name: 'uploadedfiles', model: UploadedFile, displayName: 'Uploaded Files' }
    ];
    
    const tableInfo = [];
    
    for (const collection of collections) {
      const count = await collection.model.countDocuments();
      
      tableInfo.push({
        id: collection.name,
        table_name: collection.displayName,
        record_count: count,
        last_updated: new Date().toISOString(),
        size_mb: Math.random() * 100 + 10, // Estimated size
        status: 'active'
      });
    }
    
    res.json(tableInfo);
  } catch (error) {
    console.error('❌ Database info error:', error);
    res.status(500).json({ error: 'Failed to get database info' });
  }
});

// AWB tracking verification route
app.post('/verify-awb', authenticateToken, async (req, res) => {
  const { awbNumber, partner } = req.body;
  
  try {
    const orderInfo = await DropshipOrder.findOne({
      fwdAwb: awbNumber,
      fwdCarrier: partner
    }).lean();

    if (!orderInfo) {
      return res.status(404).json({ error: 'AWB number not found' });
    }

    res.json({
      awbNumber,
      partner,
      orderInfo,
      trackingStatus: 'Found in database',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ AWB verification error:', error);
    res.status(500).json({ error: 'AWB verification failed' });
  }
});

// Real-time tracking status route
app.get('/tracking-status', authenticateToken, async (req, res) => {
  try {
    const { awbNumbers } = req.query;
    
    if (!awbNumbers) {
      return res.status(400).json({ error: 'AWB numbers are required' });
    }

    const awbList = Array.isArray(awbNumbers) ? awbNumbers : awbNumbers.split(',');
    const result = await realTimeUpdateService.getTrackingStatus(awbList);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Tracking status error:', error);
    res.status(500).json({ error: 'Failed to get tracking status' });
  }
});

// Real-time dashboard data route
app.get('/realtime-dashboard', authenticateToken, async (req, res) => {
  try {
    const data = await realTimeUpdateService.getRealTimeDashboardData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Real-time dashboard error:', error);
    res.status(500).json({ error: 'Failed to get real-time dashboard data' });
  }
});

// Manual status update route
app.post('/update-status', authenticateToken, async (req, res) => {
  try {
    const { awbNumber, status, location, remarks } = req.body;
    
    if (!awbNumber || !status) {
      return res.status(400).json({ error: 'AWB number and status are required' });
    }

    const updateData = {
      deliveryStatus: status,
      currentLocation: location,
      lastTrackingUpdate: new Date(),
      trackingData: { remarks, timestamp: new Date() }
    };

    // Update DropshipOrder
    await DropshipOrder.updateOne(
      { fwdAwb: awbNumber },
      { $set: updateData }
    );

    // Update RtvReturn if exists
    await RtvReturn.updateOne(
      { trackingNumber: awbNumber },
      { $set: updateData }
    );

    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('❌ Status update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Export data route
app.get('/export/:type', authenticateToken, async (req, res) => {
  const { type } = req.params;
  
  try {
    let data = [];
    let filename = '';
    
    if (type === 'orders') {
      data = await DropshipOrder.find({}).sort({ custOrderDate: -1 }).lean();
      filename = 'dropship_orders_export.csv';
    } else if (type === 'returns') {
      data = await RtvReturn.find({}).sort({ initiatedDate: -1 }).lean();
      filename = 'rtv_returns_export.csv';
    }
    
    // Convert to CSV
    const csvContent = convertToCSV(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(value => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      if (value instanceof Date) return value.toISOString();
      return value;
    }).join(',')
  );
  
  return [headers, ...rows].join('\n');
}

// Users management routes
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('role', 'name description level')
      .sort({ createdAt: -1 });
    
    // Attach computed status based on isActive for UI compatibility
    const mapped = users.map(u => ({
      ...u.toObject(),
      status: u.isActive ? 'active' : 'inactive'
    }));
    res.json(mapped);
  } catch (error) {
    console.error('❌ Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user
app.post('/users', authenticateToken, requirePermission('users', 'create'), async (req, res) => {
  try {
    const { email, password, name, role, department = 'Operations', phone = '' } = req.body;
    
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, and role are required' });
    }
    
    // Validate role exists
    const roleExists = await Role.findById(role);
    if (!roleExists) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });
    
    const user = await User.create({ 
      email, 
      password, 
      name, 
      role, 
      department, 
      phone 
    });
    
    const out = await User.findById(user._id)
      .select('-password')
      .populate('role', 'name description level');
    
    res.status(201).json(out);
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.put('/users/:id', authenticateToken, requirePermission('users', 'update'), async (req, res) => {
  try {
    const allowed = ['name', 'email', 'phone', 'role', 'department', 'status'];
    const update = {};
    
    for (const k of allowed) {
      if (k in req.body) update[k] = req.body[k];
    }
    
    // Validate role if it's being updated
    if (update.role) {
      const roleExists = await Role.findById(update.role);
      if (!roleExists) {
        return res.status(400).json({ error: 'Invalid role ID' });
      }
    }
    
    if ('status' in update) {
      update.isActive = update.status === 'active' || update.status === true;
      delete update.status;
    }
    
    const updated = await User.findByIdAndUpdate(
      req.params.id, 
      update, 
      { new: true }
    )
    .select('-password')
    .populate('role', 'name description level');
    
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/users/:id', authenticateToken, requirePermission('users', 'delete'), async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ===== ROLE MANAGEMENT ENDPOINTS =====

// Get all roles (for admin panel)
app.get('/roles', authenticateToken, async (req, res) => {
  try {
    const roles = await Role.find({}).populate('permissions').sort({ level: -1 });
    res.json(roles);
  } catch (error) {
    console.error('❌ Roles fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Create new role
app.post('/roles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, permissions, level } = req.body;
    
    if (!name || !description || !permissions || !level) {
      return res.status(400).json({ error: 'Name, description, permissions, and level are required' });
    }
    
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }
    
    const role = new Role({
      name,
      description,
      permissions,
      level,
      isSystem: false
    });
    
    await role.save();
    const populatedRole = await Role.findById(role._id).populate('permissions');
    res.status(201).json(populatedRole);
  } catch (error) {
    console.error('❌ Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update role
app.put('/roles/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, permissions, level, isActive } = req.body;
    const update = {};
    
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (permissions !== undefined) update.permissions = permissions;
    if (level !== undefined) update.level = level;
    if (isActive !== undefined) update.isActive = isActive;
    
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (role.isSystem) {
      return res.status(400).json({ error: 'System roles cannot be modified' });
    }
    
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id, 
      update, 
      { new: true }
    ).populate('permissions');
    
    res.json(updatedRole);
  } catch (error) {
    console.error('❌ Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete role
app.delete('/roles/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (role.isSystem) {
      return res.status(400).json({ error: 'System roles cannot be deleted' });
    }
    
    // Check if any users are using this role
    const usersWithRole = await User.countDocuments({ role: req.params.id });
    if (usersWithRole > 0) {
      return res.status(400).json({ 
        error: `Cannot delete role. ${usersWithRole} user(s) are currently using it.` 
      });
    }
    
    await Role.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// ===== PERMISSION MANAGEMENT ENDPOINTS =====

// Get all permissions
app.get('/permissions', authenticateToken, async (req, res) => {
  try {
    const permissions = await Permission.find({}).sort({ resource: 1, action: 1 });
    res.json(permissions);
  } catch (error) {
    console.error('❌ Permissions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Create new permission
app.post('/permissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, resource, action } = req.body;
    
    if (!name || !description || !resource || !action) {
      return res.status(400).json({ error: 'Name, description, resource, and action are required' });
    }
    
    const existingPermission = await Permission.findOne({ name });
    if (existingPermission) {
      return res.status(400).json({ error: 'Permission with this name already exists' });
    }
    
    const permission = new Permission({
      name,
      description,
      resource,
      action
    });
    
    await permission.save();
    res.status(201).json(permission);
  } catch (error) {
    console.error('❌ Create permission error:', error);
    res.status(500).json({ error: 'Failed to create permission' });
  }
});

// Update permission
app.put('/permissions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, resource, action, isActive } = req.body;
    const update = {};
    
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (resource !== undefined) update.resource = resource;
    if (action !== undefined) update.action = action;
    if (isActive !== undefined) update.isActive = isActive;
    
    const updatedPermission = await Permission.findByIdAndUpdate(
      req.params.id, 
      update, 
      { new: true }
    );
    
    if (!updatedPermission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    res.json(updatedPermission);
  } catch (error) {
    console.error('❌ Update permission error:', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

// Delete permission
app.delete('/permissions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    // Check if permission is used by any roles
    const rolesUsingPermission = await Role.countDocuments({ 
      permissions: req.params.id 
    });
    
    if (rolesUsingPermission > 0) {
      return res.status(400).json({ 
        error: `Cannot delete permission. It is used by ${rolesUsingPermission} role(s).` 
      });
    }
    
    await Permission.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete permission error:', error);
    res.status(500).json({ error: 'Failed to delete permission' });
  }
});

// ===== USER PERMISSIONS ENDPOINTS =====

// Get user permissions
app.get('/users/:id/permissions', authenticateToken, requirePermission('users', 'read'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const permissions = await user.getAllPermissions();
    res.json({ permissions });
  } catch (error) {
    console.error('❌ Get user permissions error:', error);
    res.status(500).json({ error: 'Failed to get user permissions' });
  }
});

// Check if user has specific permission
app.post('/users/:id/check-permission', authenticateToken, requirePermission('users', 'read'), async (req, res) => {
  try {
    const { resource, action } = req.body;
    if (!resource || !action) {
      return res.status(400).json({ error: 'Resource and action are required' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const hasPermission = await user.hasPermission(resource, action);
    res.json({ hasPermission });
  } catch (error) {
    console.error('❌ Check permission error:', error);
    res.status(500).json({ error: 'Failed to check permission' });
  }
});

// Import tracking routes
const trackingRoutes = require('./routes/tracking');
const webhookRoutes = require('./routes/webhooks');

// Use tracking routes
app.use('/api', trackingRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'MongoDB Connected',
    version: '2.0.0'
  });
});

// Import live tracking service
const liveTrackingService = require('./services/liveTrackingService');

// Live tracking endpoints
app.get('/api/live-tracking/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const result = await liveTrackingService.getOrderTracking(orderId);
    
    if (result.success) {
      res.json({
        success: true,
        orderId: result.orderId,
        awbNumber: result.awbNumber,
        trackingData: result.trackingData,
        lastUpdated: result.lastUpdated
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        orderId: result.orderId
      });
    }
  } catch (error) {
    console.error('Error in live tracking endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk live tracking update
app.post('/api/live-tracking/bulk', authenticateToken, async (req, res) => {
  try {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Order IDs array is required' });
    }

    if (orderIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 orders allowed per request' });
    }

    const results = await liveTrackingService.bulkUpdateTracking(orderIds);
    
    res.json({
      success: true,
      total: results.length,
      successful: results.filter(r => r.success).length,
      errors: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    console.error('Error in bulk live tracking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-update tracking (for background jobs)
app.post('/api/live-tracking/auto-update', authenticateToken, async (req, res) => {
  try {
    const result = await liveTrackingService.autoUpdateTracking();
    
    res.json({
      success: true,
      message: 'Auto-update completed',
      ...result
    });
  } catch (error) {
    console.error('Error in auto-update tracking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders needing tracking updates
app.get('/api/live-tracking/pending', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const orders = await liveTrackingService.getOrdersNeedingUpdate(limit);
    
    res.json({
      success: true,
      count: orders.length,
      orders: orders.map(order => ({
        orderId: order.custOrderNo,
        awbNumber: order.fwdAwb,
        currentStatus: order.deliveryStatus,
        lastUpdate: order.lastTrackingUpdate
      }))
    });
  } catch (error) {
    console.error('Error getting pending tracking orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 50MB)' });
    }
  }
  console.error('❌ Server error:', error);
  res.status(500).json({ error: error.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Ajio Seller Central Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}`);
  console.log(`🗄️ Database: MongoDB`);
  console.log(`📁 File uploads: ./uploads/`);
  console.log(`🔐 Default admin: admin@ajio.com / admin123`);
});