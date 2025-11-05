const express = require('express');
const jwt = require('jsonwebtoken');
const cheerio = require('cheerio');
const User = require('../models/User');
const DropshipOrder = require('../models/DropshipOrder');
const RtvReturn = require('../models/RtvReturn');
const TrackingLog = require('../models/TrackingLog');
const statusMappingService = require('../services/statusMappingService');
const reportProcessor = require('../services/reportProcessor');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ajio_secret_key_2025');
    const user = await User.findById(decoded.id).populate('role', 'name description level');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Function to fetch real Delhivery status from their tracking page
const fetchDelhiveryStatus = async (awbNumber) => {
  try {
    // Delhivery's public tracking page URL
    const delhiveryUrl = `https://www.delhivery.com/track-v2/package/${awbNumber}`;
    
    console.log(`Fetching package status from: ${delhiveryUrl}`);
    
    const response = await fetch(delhiveryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      // Parse the HTML to extract tracking information
      return parseDelhiveryHtml(html, awbNumber);
    } else {
      console.error(`Failed to fetch from Delhivery: ${response.status} ${response.statusText}`);
      // Fallback to mock data if page fetch fails
      return generateMockResponse(awbNumber);
    }
  } catch (error) {
    console.error('Delhivery page fetch error:', error);
    // Fallback to mock data
    return generateMockResponse(awbNumber);
  }
};

// Parse Delhivery's HTML page to extract tracking information
const parseDelhiveryHtml = (html, awbNumber) => {
  try {
    const $ = cheerio.load(html);
    
    // Check if package is not found or invalid
    const notFoundIndicators = [
      'not found', 'invalid', 'no data', 'tracking not available', 
      'AWB not found', 'package not found', 'no tracking information'
    ];
    
    const pageText = $.text().toLowerCase();
    const isNotFound = notFoundIndicators.some(indicator => pageText.includes(indicator));
    
    if (isNotFound) {
      return {
        awb: awbNumber,
        status: 'Not Found',
        currentLocation: 'Unknown',
        lastUpdate: new Date().toISOString(),
        estimatedDelivery: null,
        trackingHistory: [{
          timestamp: new Date().toISOString(),
          location: 'Unknown',
          status: 'Not Found',
          description: 'Package tracking information not available'
        }],
        error: 'Package not found or tracking information not available'
      };
    }
    
    // Extract status information using multiple selectors
    let status = 'Unknown';
    let location = 'Unknown';
    let lastUpdate = new Date().toISOString();
    
    // Try to find status in various possible selectors
    const statusSelectors = [
      '.status', '.package-status', '.tracking-status', '.current-status',
      '[class*="status"]', '[id*="status"]', '.status-text', '.status-label',
      '.delivery-status', '.shipment-status'
    ];
    
    for (const selector of statusSelectors) {
      const statusElement = $(selector).first();
      if (statusElement.length && statusElement.text().trim()) {
        status = statusElement.text().trim();
        break;
      }
    }
    
    // Try to find location information
    const locationSelectors = [
      '.location', '.current-location', '.package-location', '.tracking-location',
      '[class*="location"]', '[id*="location"]', '.location-text', '.location-label',
      '.delivery-location', '.shipment-location'
    ];
    
    for (const selector of locationSelectors) {
      const locationElement = $(selector).first();
      if (locationElement.length && locationElement.text().trim()) {
        location = locationElement.text().trim();
        break;
      }
    }
    
    // Try to find timestamp information
    const timeSelectors = [
      '.timestamp', '.last-updated', '.update-time', '.tracking-time',
      '[class*="time"]', '[id*="time"]', '.time-text', '.time-label',
      '.delivery-time', '.shipment-time'
    ];
    
    for (const selector of timeSelectors) {
      const timeElement = $(selector).first();
      if (timeElement.length && timeElement.text().trim()) {
        const timeStr = timeElement.text().trim();
        try {
          const parsedDate = new Date(timeStr);
          if (!isNaN(parsedDate.getTime())) {
            lastUpdate = parsedDate.toISOString();
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    }
    
    // Fallback: Look for common patterns in the text
    if (status === 'Unknown') {
      const statusMatch = html.match(/(?:status|current status)[:\s]+([^<\n]+)/i);
      if (statusMatch) {
        status = statusMatch[1].trim();
      }
    }
    
    if (location === 'Unknown') {
      const locationMatch = html.match(/(?:location|current location)[:\s]+([^<\n]+)/i);
      if (locationMatch) {
        location = locationMatch[1].trim();
      }
    }
    
    // Extract tracking history if available
    let trackingHistory = [];
    
    // Look for tracking timeline or history
    const timelineSelectors = [
      '.timeline', '.tracking-timeline', '.shipment-timeline', '.delivery-timeline',
      '.tracking-history', '.shipment-history', '.delivery-history',
      '[class*="timeline"]', '[class*="history"]'
    ];
    
    for (const selector of timelineSelectors) {
      const timeline = $(selector);
      if (timeline.length) {
        timeline.find('.timeline-item, .history-item, .tracking-item, li').each((i, element) => {
          const $item = $(element);
          const itemStatus = $item.find('.status, .item-status').text().trim() || 
                           $item.text().match(/([^:]+):/)?.[1]?.trim() || 'Unknown';
          const itemLocation = $item.find('.location, .item-location').text().trim() || 
                             $item.text().match(/at\s+([^,]+)/)?.[1]?.trim() || 'Unknown';
          const itemTime = $item.find('.time, .item-time').text().trim() || 
                          $item.text().match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/)?.[1]?.trim() || 
                          new Date().toISOString();
          
          trackingHistory.push({
            timestamp: itemTime,
            location: itemLocation,
            status: itemStatus,
            description: `${itemStatus} at ${itemLocation}`
          });
        });
        
        if (trackingHistory.length > 0) {
          break;
        }
      }
    }
    
    // If no tracking history found, generate based on current status
    if (trackingHistory.length === 0) {
      trackingHistory = generateTrackingHistory(status, location, lastUpdate);
    }
    
    return {
      awb: awbNumber,
      status: status,
      currentLocation: location,
      lastUpdate: lastUpdate,
      estimatedDelivery: status.toLowerCase().includes('delivered') ? null : 
                        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      trackingHistory: trackingHistory,
      isRealData: true,
      source: 'Delhivery'
    };
    
  } catch (error) {
    console.error('Error parsing Delhivery HTML:', error);
    // Fallback to mock data if parsing fails
    return generateMockResponse(awbNumber);
  }
};

// Generate tracking history based on current status
const generateTrackingHistory = (currentStatus, currentLocation, lastUpdate) => {
  const history = [];
  const now = new Date(lastUpdate);
  
  // Common tracking milestones
  const milestones = [
    { status: 'Picked Up', location: 'Origin Hub', daysAgo: 3 },
    { status: 'In Transit', location: 'Sorting Facility', daysAgo: 2 },
    { status: 'In Transit', location: 'Transit Hub', daysAgo: 1 }
  ];
  
  // Add milestones before current status
  for (const milestone of milestones) {
    if (milestone.status !== currentStatus) {
      const timestamp = new Date(now.getTime() - milestone.daysAgo * 24 * 60 * 60 * 1000);
      history.push({
        timestamp: timestamp.toISOString(),
        location: milestone.location,
        status: milestone.status,
        description: `Package ${milestone.status.toLowerCase()}`
      });
    }
  }
  
  // Add current status
  history.push({
    timestamp: lastUpdate,
    location: currentLocation,
    status: currentStatus,
    description: `Package ${currentStatus.toLowerCase()}`
  });
  
  return history.reverse(); // Show oldest first
};

// Generate realistic mock response
const generateMockResponse = (awbNumber) => {
  const statuses = [
    { status: 'Picked Up', location: 'Origin Hub', description: 'Package picked up from sender' },
    { status: 'In Transit', location: 'Sorting Facility', description: 'Package is being sorted for delivery' },
    { status: 'In Transit', location: 'Transit Hub', description: 'Package is in transit to destination' },
    { status: 'Out for Delivery', location: 'Local Facility', description: 'Package is out for delivery' },
    { status: 'Delivered', location: 'Destination', description: 'Package has been delivered successfully' },
    { status: 'Exception', location: 'Local Facility', description: 'Delivery exception occurred' }
  ];
  
  const currentStatus = statuses[Math.floor(Math.random() * statuses.length)];
  const isDelivered = currentStatus.status === 'Delivered';
  
  // Generate tracking history
  const trackingHistory = [];
  const currentIndex = statuses.findIndex(s => s.status === currentStatus.status);
  
  for (let i = 0; i <= currentIndex; i++) {
    const status = statuses[i];
    const timestamp = new Date(Date.now() - (currentIndex - i) * 24 * 60 * 60 * 1000);
    
    trackingHistory.push({
      timestamp: timestamp.toISOString(),
      location: status.location,
      status: status.status,
      description: status.description
    });
  }
  
  return {
    awb: awbNumber,
    status: currentStatus.status,
    currentLocation: currentStatus.location,
    lastUpdate: new Date().toISOString(),
    estimatedDelivery: isDelivered ? null : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    trackingHistory: trackingHistory.reverse(), // Show oldest first
    isRealData: false,
    source: 'Demo Data'
  };
};

// Track package by AWB number
router.get('/track-package/:awb', authenticateToken, async (req, res) => {
  try {
    const { awb } = req.params;
    
    // Validate AWB number format (basic validation)
    if (!awb || awb.length < 10) {
      return res.status(400).json({ 
        error: 'Invalid AWB number format' 
      });
    }
    
    // Fetch status from Delhivery (mock implementation)
    const packageStatus = await fetchDelhiveryStatus(awb);
    
    res.json(packageStatus);
  } catch (error) {
    console.error('Error tracking package:', error);
    res.status(500).json({ 
      error: 'Failed to track package' 
    });
  }
});

// Bulk track multiple packages
router.post('/track-packages', authenticateToken, async (req, res) => {
  try {
    const { awbNumbers } = req.body;
    
    if (!Array.isArray(awbNumbers) || awbNumbers.length === 0) {
      return res.status(400).json({ 
        error: 'AWB numbers array is required' 
      });
    }
    
    const results = await Promise.all(
      awbNumbers.map(async (awb) => {
        try {
          return await fetchDelhiveryStatus(awb);
        } catch (error) {
          return {
            awb,
            error: 'Failed to fetch status'
          };
        }
      })
    );
    
    res.json({ results });
  } catch (error) {
    console.error('Error tracking packages:', error);
    res.status(500).json({ 
      error: 'Failed to track packages' 
    });
  }
});

// Shadowfax tracking endpoint
// GET /api/track/shadowfax/:awb
// Description: Proxies request to Shadowfax tracking and returns `{ courier: "shadowfax", data }`
router.get('/track/shadowfax/:awb', authenticateToken, async (req, res) => {
    try {
        const { awb } = req.params;
        const url = `https://track.shadowfax.in/track?trackingId=${encodeURIComponent(awb)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            }
        });
        if (!response.ok) {
            return res.status(500).json({ error: 'Failed to fetch tracking data' });
        }
        let data;
        try {
            data = await response.json();
        } catch (_) {
            const text = await response.text();
            return res.json({ courier: 'shadowfax', data: { raw: text } });
        }

        // Persist normalized fields for dashboard
        try {
            const originalStatus = data.status || data.current_status || data.currentStatus || data.tracking_status || data.deliveryStatus || '';
            const mappedStatus = statusMappingService.mapOrderStatus(originalStatus || 'Pending');
            const currentLocation = data.current_location || data.location || data.currentLocation || '';
            const trackingHistory = Array.isArray(data.history || data.tracking_history || data.events)
                ? (data.history || data.tracking_history || data.events).map(ev => ({
                    timestamp: new Date(ev.timestamp || ev.time || ev.event_time || Date.now()),
                    status: (ev.status || ev.event || ev.state || '').toString(),
                    location: (ev.location || ev.hub || ev.city || currentLocation || '').toString(),
                    remarks: (ev.remarks || ev.description || '').toString(),
                    source: 'shadowfax'
                }))
                : [];

            await DropshipOrder.updateOne(
                { fwdAwb: awb },
                {
                    $set: {
                        deliveryStatus: mappedStatus,
                        currentLocation: currentLocation || undefined,
                        lastTrackingUpdate: new Date(),
                        trackingData: data,
                        trackingSource: 'shadowfax',
                        trackingLastChecked: new Date(),
                        trackingError: null,
                        isTrackingActive: true
                    },
                    ...(trackingHistory.length ? { $push: { trackingHistory: { $each: trackingHistory } } } : {})
                }
            );
        } catch (dbErr) {
            console.error('Shadowfax DB persist error:', dbErr);
        }

        return res.json({ courier: 'shadowfax', data });
    } catch (error) {
        console.error('Shadowfax tracking error:', error);
        return res.status(500).json({ error: 'Failed to fetch tracking data' });
    }
});

// XpressBees tracking endpoint
// GET /api/track/xpressbees/:awb
// Description: Proxies request to XpressBees tracking and returns `{ courier: "xpressbees", data }`
router.get('/track/xpressbees/:awb', authenticateToken, async (req, res) => {
    try {
        const { awb } = req.params;
        const url = `https://shipment.xpressbees.com/api/track?awb=${encodeURIComponent(awb)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            }
        });
        if (!response.ok) {
            return res.status(500).json({ error: 'Failed to fetch tracking data' });
        }
        let data;
        try {
            data = await response.json();
        } catch (_) {
            const text = await response.text();
            return res.json({ courier: 'xpressbees', data: { raw: text } });
        }

        // Persist normalized fields for dashboard
        try {
            const originalStatus = data.status || data.current_status || data.currentStatus || data.tracking_status || data.deliveryStatus || '';
            const mappedStatus = statusMappingService.mapOrderStatus(originalStatus || 'Pending');
            const currentLocation = data.current_location || data.location || data.currentLocation || '';
            const trackingHistory = Array.isArray(data.history || data.tracking_history || data.events)
                ? (data.history || data.tracking_history || data.events).map(ev => ({
                    timestamp: new Date(ev.timestamp || ev.time || ev.event_time || Date.now()),
                    status: (ev.status || ev.event || ev.state || '').toString(),
                    location: (ev.location || ev.hub || ev.city || currentLocation || '').toString(),
                    remarks: (ev.remarks || ev.description || '').toString(),
                    source: 'xpressbees'
                }))
                : [];

            await DropshipOrder.updateOne(
                { fwdAwb: awb },
                {
                    $set: {
                        deliveryStatus: mappedStatus,
                        currentLocation: currentLocation || undefined,
                        lastTrackingUpdate: new Date(),
                        trackingData: data,
                        trackingSource: 'xpressbees',
                        trackingLastChecked: new Date(),
                        trackingError: null,
                        isTrackingActive: true
                    },
                    ...(trackingHistory.length ? { $push: { trackingHistory: { $each: trackingHistory } } } : {})
                }
            );
        } catch (dbErr) {
            console.error('XpressBees DB persist error:', dbErr);
        }

        return res.json({ courier: 'xpressbees', data });
    } catch (error) {
        console.error('XpressBees tracking error:', error);
        return res.status(500).json({ error: 'Failed to fetch tracking data' });
    }
});

// Auto-detect carrier and track by AWB for orders/returns, persist snapshot log, and update matched record
// GET /api/track/auto/:awb
router.get('/track/auto/:awb', authenticateToken, async (req, res) => {
  try {
    const { awb } = req.params;

    // Find matching order or return to detect carrier without changing it
    const order = await DropshipOrder.findOne({ fwdAwb: awb }).select('fwdAwb fwdCarrier _id');
    const rtv = !order ? await RtvReturn.findOne({ trackingNumber: awb }).select('trackingNumber shippingPartner _id') : null;

    let carrier = null;
    if (order && order.fwdCarrier) carrier = String(order.fwdCarrier).toUpperCase();
    else if (rtv && rtv.shippingPartner) carrier = String(rtv.shippingPartner).toUpperCase();

    if (!carrier) {
      return res.status(404).json({ error: 'Carrier not found for this AWB' });
    }

    // Route to specific provider
    let result;
    if (carrier.includes('DELHIVERY')) {
      const delhiveryService = require('../services/delhiveryService');
      result = await delhiveryService.trackShipment(awb);
      if (!result) return res.status(404).json({ error: 'No tracking data found' });

      // Persist to order/return as before
      try {
        const mappedStatus = statusMappingService.mapOrderStatus(result.originalStatus || result.status);
        await DropshipOrder.updateOne(
          { fwdAwb: awb },
          {
            $set: {
              deliveryStatus: mappedStatus,
              currentLocation: result.currentLocation,
              lastTrackingUpdate: new Date(),
              trackingData: result,
              trackingSource: 'delhivery',
              trackingLastChecked: new Date(),
              trackingError: null,
              isTrackingActive: true
            },
            ...(Array.isArray(result.trackingHistory) && result.trackingHistory.length
              ? { $push: { trackingHistory: { $each: result.trackingHistory.map(h => ({
                    timestamp: new Date(h.timestamp || Date.now()),
                    status: h.status,
                    location: h.location,
                    remarks: h.description || '' ,
                    source: 'delhivery'
                })) } } }
              : {})
          }
        );
      } catch (e) { console.error('Auto track Delhivery DB error:', e); }

      // Write snapshot log
      await TrackingLog.create({
        awbNumber: awb,
        courier: 'DELHIVERY',
        status: result.status,
        originalStatus: result.originalStatus,
        currentLocation: result.currentLocation,
        source: 'delhivery',
        response: result,
        linkedOrderId: order?._id || undefined,
        linkedReturnId: rtv?._id || undefined
      });

      return res.json({ courier: 'delhivery', data: result });
    }

    if (carrier.includes('SHADOWFAX')) {
      const url = `https://track.shadowfax.in/track?trackingId=${encodeURIComponent(awb)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        }
      });
      if (!response.ok) return res.status(500).json({ error: 'Failed to fetch tracking data' });
      let data; try { data = await response.json(); } catch { data = { raw: await response.text() }; }

      // Minimal normalization
      const originalStatus = data.status || data.current_status || data.currentStatus || data.tracking_status || data.deliveryStatus || '';
      const mappedStatus = statusMappingService.mapOrderStatus(originalStatus || 'Pending');
      const currentLocation = data.current_location || data.location || data.currentLocation || '';
      const trackingHistory = Array.isArray(data.history || data.tracking_history || data.events)
        ? (data.history || data.tracking_history || data.events).map(ev => ({
            timestamp: new Date(ev.timestamp || ev.time || ev.event_time || Date.now()),
            status: (ev.status || ev.event || ev.state || '').toString(),
            location: (ev.location || ev.hub || ev.city || currentLocation || '').toString(),
            remarks: (ev.remarks || ev.description || '').toString(),
            source: 'shadowfax'
          }))
        : [];

      try {
        await DropshipOrder.updateOne(
          { fwdAwb: awb },
          {
            $set: {
              deliveryStatus: mappedStatus,
              currentLocation: currentLocation || undefined,
              lastTrackingUpdate: new Date(),
              trackingData: data,
              trackingSource: 'shadowfax',
              trackingLastChecked: new Date(),
              trackingError: null,
              isTrackingActive: true
            },
            ...(trackingHistory.length ? { $push: { trackingHistory: { $each: trackingHistory } } } : {})
          }
        );

        await RtvReturn.updateOne(
          { trackingNumber: awb },
          {
            $set: {
              deliveryStatus: mappedStatus,
              currentLocation: currentLocation || undefined,
              lastTrackingUpdate: new Date(),
              trackingData: data
            }
          }
        );
      } catch (e) { console.error('Auto track Shadowfax DB error:', e); }

      await TrackingLog.create({
        awbNumber: awb,
        courier: 'SHADOWFAX',
        status: mappedStatus,
        originalStatus,
        currentLocation,
        source: 'shadowfax',
        response: data,
        linkedOrderId: order?._id || undefined,
        linkedReturnId: rtv?._id || undefined
      });

      return res.json({ courier: 'shadowfax', data });
    }

    if (carrier.includes('XPRESS') || carrier.includes('XPRESSBEES')) {
      const url = `https://shipment.xpressbees.com/api/track?awb=${encodeURIComponent(awb)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        }
      });
      if (!response.ok) return res.status(500).json({ error: 'Failed to fetch tracking data' });
      let data; try { data = await response.json(); } catch { data = { raw: await response.text() }; }

      const originalStatus = data.status || data.current_status || data.currentStatus || data.tracking_status || data.deliveryStatus || '';
      const mappedStatus = statusMappingService.mapOrderStatus(originalStatus || 'Pending');
      const currentLocation = data.current_location || data.location || data.currentLocation || '';
      const trackingHistory = Array.isArray(data.history || data.tracking_history || data.events)
        ? (data.history || data.tracking_history || data.events).map(ev => ({
            timestamp: new Date(ev.timestamp || ev.time || ev.event_time || Date.now()),
            status: (ev.status || ev.event || ev.state || '').toString(),
            location: (ev.location || ev.hub || ev.city || currentLocation || '').toString(),
            remarks: (ev.remarks || ev.description || '').toString(),
            source: 'xpressbees'
          }))
        : [];

      try {
        await DropshipOrder.updateOne(
          { fwdAwb: awb },
          {
            $set: {
              deliveryStatus: mappedStatus,
              currentLocation: currentLocation || undefined,
              lastTrackingUpdate: new Date(),
              trackingData: data,
              trackingSource: 'xpressbees',
              trackingLastChecked: new Date(),
              trackingError: null,
              isTrackingActive: true
            },
            ...(trackingHistory.length ? { $push: { trackingHistory: { $each: trackingHistory } } } : {})
          }
        );

        await RtvReturn.updateOne(
          { trackingNumber: awb },
          {
            $set: {
              deliveryStatus: mappedStatus,
              currentLocation: currentLocation || undefined,
              lastTrackingUpdate: new Date(),
              trackingData: data
            }
          }
        );
      } catch (e) { console.error('Auto track XpressBees DB error:', e); }

      await TrackingLog.create({
        awbNumber: awb,
        courier: 'XPRESSBEES',
        status: mappedStatus,
        originalStatus,
        currentLocation,
        source: 'xpressbees',
        response: data,
        linkedOrderId: order?._id || undefined,
        linkedReturnId: rtv?._id || undefined
      });

      return res.json({ courier: 'xpressbees', data });
    }

    return res.status(400).json({ error: `Unsupported carrier for AWB: ${carrier}` });
  } catch (error) {
    console.error('Auto tracking error:', error);
    return res.status(500).json({ error: 'Failed to fetch tracking data' });
  }
});

// Manual verification via partner website (HTML scraping) for a given AWB
// GET /api/track/manual-verify/:awb
router.get('/track/manual-verify/:awb', authenticateToken, async (req, res) => {
  try {
    const { awb } = req.params;
    const order = await DropshipOrder.findOne({ fwdAwb: awb }).select('fwdAwb fwdCarrier _id');
    const rtv = !order ? await RtvReturn.findOne({ trackingNumber: awb }).select('trackingNumber shippingPartner _id') : null;

    let carrier = null;
    if (order && order.fwdCarrier) carrier = String(order.fwdCarrier).toUpperCase();
    else if (rtv && rtv.shippingPartner) carrier = String(rtv.shippingPartner).toUpperCase();
    if (!carrier) return res.status(404).json({ error: 'Carrier not found for this AWB' });

    let partnerStatus = '';
    let html = '';
    let source = '';

    if (carrier.includes('DELHIVERY')) {
      const map = await reportProcessor.fetchDelhiveryHtmlStatuses([awb]);
      html = map[awb] || '';
      partnerStatus = reportProcessor.mapDelhiveryHtmlToOrderStatus(html);
      source = 'delhivery-manual';
    } else if (carrier.includes('SHADOWFAX')) {
      const map = await reportProcessor.fetchShadowfaxStatuses([awb]);
      html = map[awb] || '';
      partnerStatus = reportProcessor.mapShadowfaxToOrderStatus(html);
      source = 'shadowfax-manual';
    } else if (carrier.includes('XPRESS') || carrier.includes('XPRESSBEES')) {
      const map = await reportProcessor.fetchHtmlStatuses((w) => `https://www.xpressbees.com/track?isawb=Yes&track=${encodeURIComponent(w)}`, [awb]);
      html = map[awb] || '';
      partnerStatus = reportProcessor.mapGenericHtmlToOrderStatus(html);
      source = 'xpressbees-manual';
    } else {
      return res.status(400).json({ error: `Unsupported carrier for manual verification: ${carrier}` });
    }

    const partnerVerifiedAt = new Date();
    const partnerVerifiedRaw = { htmlLength: (html || '').length, snippet: (html || '').substring(0, 2000) };

    // Update order/return with manual verification snapshot without changing carrier
    await DropshipOrder.updateOne(
      { fwdAwb: awb },
      { $set: { partnerVerifiedStatus: partnerStatus, partnerVerifiedAt, partnerVerifiedSource: source, partnerVerifiedRaw } }
    );
    await RtvReturn.updateOne(
      { trackingNumber: awb },
      { $set: { partnerVerifiedStatus: partnerStatus, partnerVerifiedAt, partnerVerifiedSource: source, partnerVerifiedRaw } }
    );

    // Log snapshot
    await TrackingLog.create({
      awbNumber: awb,
      courier: carrier,
      status: partnerStatus,
      originalStatus: partnerStatus,
      currentLocation: undefined,
      source,
      response: partnerVerifiedRaw,
      linkedOrderId: order?._id || undefined,
      linkedReturnId: rtv?._id || undefined
    });

    return res.json({ courier: carrier.toLowerCase(), data: { status: partnerStatus, verifiedAt: partnerVerifiedAt, source } });
  } catch (error) {
    console.error('Manual verify error:', error);
    return res.status(500).json({ error: 'Failed to verify tracking data' });
  }
});

// Return a summary comparing Ajio status vs partner verified status
// GET /api/track/verify-summary/:awb
router.get('/track/verify-summary/:awb', authenticateToken, async (req, res) => {
  try {
    const { awb } = req.params;
    const order = await DropshipOrder.findOne({ fwdAwb: awb }).lean();
    const rtv = !order ? await RtvReturn.findOne({ trackingNumber: awb }).lean() : null;

    const record = order || rtv;
    if (!record) return res.status(404).json({ error: 'Record not found for this AWB' });

    // Ajio side (prefer deliveryStatus for orders, status for returns)
    const ajioStatus = order ? (order.deliveryStatus || order.status || '') : (rtv?.status || rtv?.deliveryStatus || '');
    const partnerStatus = record.partnerVerifiedStatus || '';
    const matched = ajioStatus && partnerStatus ? ajioStatus.toString().toLowerCase() === partnerStatus.toString().toLowerCase() : false;

    // Latest tracking log
    const latestLog = await TrackingLog.findOne({ awbNumber: awb }).sort({ createdAt: -1 }).lean();

    res.json({
      awb,
      ajioStatus,
      partnerStatus,
      matched,
      verifiedAt: record.partnerVerifiedAt || null,
      source: record.partnerVerifiedSource || null,
      latestLog
    });
  } catch (error) {
    console.error('Verify summary error:', error);
    return res.status(500).json({ error: 'Failed to build verification summary' });
  }
});

// Debug endpoint to test HTML parsing
router.get('/debug/parse-delhivery/:awb', authenticateToken, async (req, res) => {
  try {
    const { awb } = req.params;
    const delhiveryUrl = `https://www.delhivery.com/track-v2/package/${awb}`;
    
    console.log(`Debug: Fetching from ${delhiveryUrl}`);
    
    const response = await fetch(delhiveryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const parsedData = parseDelhiveryHtml(html, awb);
      
      res.json({
        url: delhiveryUrl,
        statusCode: response.status,
        htmlLength: html.length,
        parsedData: parsedData,
        rawHtml: html.substring(0, 2000) + '...' // First 2000 chars for debugging
      });
    } else {
      res.status(response.status).json({
        url: delhiveryUrl,
        statusCode: response.status,
        statusText: response.statusText,
        error: 'Failed to fetch page'
      });
    }
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
