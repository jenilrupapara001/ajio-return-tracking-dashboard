/**
 * Live Tracking Service
 * 
 * This service handles real-time tracking updates by scraping partner
 * websites (same approach as Returns) and stores the data for dashboard.
 */

const DropshipOrder = require('../models/DropshipOrder');
const reportProcessor = require('./reportProcessor');

class LiveTrackingService {
  constructor() {}

  async fetchPartnerStatus(awbNumber, carrier) {
    const upper = String(carrier || '').toUpperCase();
    try {
      if (upper.includes('DELHIVERY')) {
        const map = await reportProcessor.fetchDelhiveryHtmlStatuses([awbNumber]);
        const html = map[awbNumber] || '';
        const status = reportProcessor.mapDelhiveryHtmlToOrderStatus(html);
        return { success: true, status, currentLocation: undefined, lastUpdated: new Date(), source: 'delhivery-html', raw: { htmlLength: html.length } };
      }
      if (upper.includes('SHADOWFAX')) {
        const map = await reportProcessor.fetchShadowfaxStatuses([awbNumber]);
        const html = map[awbNumber] || '';
        const status = reportProcessor.mapShadowfaxToOrderStatus(html);
        return { success: true, status, currentLocation: undefined, lastUpdated: new Date(), source: 'shadowfax-html', raw: { htmlLength: html.length } };
      }
      if (upper.includes('XPRESS') || upper.includes('XPRESSBEES')) {
        const map = await reportProcessor.fetchHtmlStatuses((awb) => `https://www.xpressbees.com/track?isawb=Yes&track=${encodeURIComponent(awb)}`, [awbNumber]);
        const html = map[awbNumber] || '';
        const status = reportProcessor.mapGenericHtmlToOrderStatus(html);
        return { success: true, status, currentLocation: undefined, lastUpdated: new Date(), source: 'xpressbees-html', raw: { htmlLength: html.length } };
      }
      return { success: false, error: `Unsupported carrier: ${carrier}`, awbNumber };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to fetch partner status', awbNumber };
    }
  }

  /**
   * Parse Delhivery API response into standardized format
   */
  parseTrackingResponse(data, awbNumber) {
    try {
      const trackingHistory = [];
      
      // Parse tracking history from scans
      if (data.scans && Array.isArray(data.scans)) {
        data.scans.forEach(scan => {
          trackingHistory.push({
            timestamp: new Date(scan.time),
            status: scan.status || 'Unknown',
            location: scan.location || 'Unknown',
            remarks: scan.remarks || '',
            source: 'delhivery'
          });
        });
      }

      // Sort tracking history by timestamp (newest first)
      trackingHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Get current status from the latest scan
      const currentStatus = trackingHistory.length > 0 ? trackingHistory[0].status : 'Unknown';
      const currentLocation = trackingHistory.length > 0 ? trackingHistory[0].location : 'Unknown';
      const lastUpdate = trackingHistory.length > 0 ? trackingHistory[0].timestamp : new Date();

      return {
        success: true,
        awbNumber,
        status: currentStatus,
        currentLocation,
        lastUpdated: lastUpdate,
        origin: data.origin || 'Unknown',
        destination: data.destination || 'Unknown',
        trackingHistory,
        rawData: data
      };
    } catch (error) {
      console.error('Error parsing tracking response:', error);
      return {
        success: false,
        error: 'Failed to parse tracking response',
        awbNumber
      };
    }
  }

  /**
   * Update order in database with tracking data
   */
  async updateOrderTracking(orderId, trackingData) {
    try {
      const updateData = {
        lastTrackingUpdate: new Date(),
        trackingLastChecked: new Date(),
        trackingSource: 'delhivery',
        isTrackingActive: true,
        trackingError: null
      };

      if (trackingData.success) {
        // Update with successful tracking data
        updateData.deliveryStatus = this.mapStatusToDeliveryStatus(trackingData.status);
        updateData.currentLocation = trackingData.currentLocation;
        updateData.trackingData = {
          ...(trackingData.rawData || {}),
          status: trackingData.status,
          currentLocation: trackingData.currentLocation,
          lastUpdated: trackingData.lastUpdated,
          origin: trackingData.origin,
          destination: trackingData.destination
        };
        if (trackingData.trackingHistory) updateData.trackingHistory = trackingData.trackingHistory;
        
        // Set delivery date if status is delivered
        if (trackingData.status.toLowerCase().includes('delivered')) {
          updateData.actualDeliveryDate = trackingData.lastUpdated;
        }
      } else {
        // Update with error information
        updateData.trackingError = trackingData.error;
        updateData.isTrackingActive = false;
      }

      const result = await DropshipOrder.updateOne(
        { custOrderNo: orderId },
        { $set: updateData }
      );

      return result;
    } catch (error) {
      console.error(`Error updating order tracking for ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Map Delhivery status to internal delivery status
   */
  mapStatusToDeliveryStatus(delhiveryStatus) {
    const status = delhiveryStatus.toLowerCase();
    
    if (status.includes('delivered') || status.includes('delivery completed')) return 'delivered';
    if (status.includes('out for delivery') || status.includes('out for delivery')) return 'out_for_delivery';
    if (status.includes('in transit') || status.includes('dispatched') || status.includes('shipped')) return 'in_transit';
    if (status.includes('picked up') || status.includes('picked up from')) return 'picked_up';
    if (status.includes('exception') || status.includes('failed')) return 'exception';
    if (status.includes('undelivered') || status.includes('delivery failed')) return 'undelivered';
    if (status.includes('rto') || status.includes('return to origin')) return 'rto';
    if (status.includes('processing') || status.includes('pending')) return 'pending';
    
    return 'pending';
  }

  /**
   * Get tracking data for a single order
   */
  async getOrderTracking(orderId) {
    try {
      const order = await DropshipOrder.findOne({ custOrderNo: orderId });
      
      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          orderId
        };
      }

      if (!order.fwdAwb) {
        return {
          success: false,
          error: 'No AWB number found for this order',
          orderId
        };
      }

      // Fetch fresh tracking data from partner website (same approach as returns)
      const trackingData = await this.fetchPartnerStatus(order.fwdAwb, order.fwdCarrier);
      
      // Update database with fresh data
      await this.updateOrderTracking(orderId, trackingData);

      // Return the tracking data
      return {
        success: true,
        orderId,
        awbNumber: order.fwdAwb,
        trackingData: trackingData.success ? trackingData : null,
        error: trackingData.success ? null : trackingData.error,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error getting tracking for order ${orderId}:`, error);
      return {
        success: false,
        error: error.message,
        orderId
      };
    }
  }

  /**
   * Bulk update tracking for multiple orders
   */
  async bulkUpdateTracking(orderIds) {
    const results = [];
    
    for (const orderId of orderIds) {
      try {
        const result = await this.getOrderTracking(orderId);
        results.push(result);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          orderId
        });
      }
    }

    return results;
  }

  /**
   * Get orders that need tracking updates
   */
  async getOrdersNeedingUpdate(limit = 50) {
    try {
      const orders = await DropshipOrder.find({
        fwdAwb: { $exists: true, $ne: null, $ne: '' },
        isTrackingActive: true,
        $or: [
          { trackingLastChecked: { $exists: false } },
          { trackingLastChecked: { $lt: new Date(Date.now() - 30 * 60 * 1000) } } // 30 minutes ago
        ]
      })
      .limit(limit)
      .select('custOrderNo fwdAwb deliveryStatus lastTrackingUpdate');

      return orders;
    } catch (error) {
      console.error('Error getting orders needing update:', error);
      return [];
    }
  }

  /**
   * Auto-update tracking for orders that need updates
   */
  async autoUpdateTracking() {
    if (!this.isEnabled) {
      console.log('Live tracking service is disabled');
      return;
    }

    try {
      const orders = await this.getOrdersNeedingUpdate(20); // Limit to 20 orders per batch
      
      if (orders.length === 0) {
        console.log('No orders need tracking updates');
        return;
      }

      console.log(`Auto-updating tracking for ${orders.length} orders`);
      
      const orderIds = orders.map(order => order.custOrderNo);
      const results = await this.bulkUpdateTracking(orderIds);
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      console.log(`Auto-update completed: ${successCount} successful, ${errorCount} errors`);
      
      return {
        total: results.length,
        successful: successCount,
        errors: errorCount,
        results
      };
    } catch (error) {
      console.error('Error in auto-update tracking:', error);
      throw error;
    }
  }
}

module.exports = new LiveTrackingService();
