const reportProcessor = require('./reportProcessor');
const DropshipOrder = require('../models/DropshipOrder');
const RtvReturn = require('../models/RtvReturn');
const statusMappingService = require('./statusMappingService');

class RealTimeUpdateService {
  constructor() {
    this.updateInterval = 5 * 60 * 1000; // 5 minutes
    this.isRunning = false;
    this.updateTimer = null;
  }

  // Start the real-time update service
  start() {
    if (this.isRunning) {
      console.log('Real-time update service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting real-time update service...');
    
    // Initial update
    this.performUpdate();
    
    // Set up interval
    this.updateTimer = setInterval(() => {
      this.performUpdate();
    }, this.updateInterval);
  }

  // Stop the real-time update service
  stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.isRunning = false;
    console.log('Real-time update service stopped');
  }

  // Perform a batch update of tracking statuses
  async performUpdate() {
    try {
      console.log('Performing real-time update...');

      // Get orders with AWB numbers that need updates
      const ordersToUpdate = await this.getOrdersNeedingUpdate();

      if (ordersToUpdate.length === 0) {
        console.log('No orders need tracking updates');
        return;
      }

      console.log(`Updating tracking for ${ordersToUpdate.length} orders`);

      // Extract AWB numbers
      const awbNumbers = ordersToUpdate.map(order => order.fwdAwb).filter(Boolean);

      if (awbNumbers.length === 0) {
        console.log('No valid AWB numbers found');
        return;
      }

      // Fetch tracking data from Delhivery HTML
      const htmlMap = await reportProcessor.fetchDelhiveryHtmlStatuses(awbNumbers);

      // Process each AWB
      const trackingData = [];
      for (const awb of awbNumbers) {
        const html = htmlMap[awb] || '';
        const status = reportProcessor.mapDelhiveryHtmlToOrderStatus(html);
        trackingData.push({
          awbNumber: awb,
          status: status,
          originalStatus: status,
          currentLocation: undefined,
          lastUpdated: new Date()
        });
      }

      // Update orders with new tracking data
      await this.updateOrdersWithTrackingData(trackingData);

      console.log(`Successfully updated ${trackingData.length} orders`);

    } catch (error) {
      console.error('Error in real-time update:', error);
    }
  }

  // Get orders that need tracking updates
  async getOrdersNeedingUpdate() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return await DropshipOrder.find({
      fwdAwb: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { lastTrackingUpdate: { $exists: false } },
        { lastTrackingUpdate: { $lt: oneHourAgo } }
      ]
    }).limit(50); // Limit to 50 orders per update to avoid API limits
  }

  // Update orders with tracking data
  async updateOrdersWithTrackingData(trackingData) {
    const updatePromises = trackingData.map(async (tracking) => {
      try {
        // Only update if we have valid tracking data
        if (!tracking || !tracking.awbNumber || !tracking.originalStatus) {
          console.log(`Skipping invalid tracking data for AWB: ${tracking?.awbNumber || 'unknown'}`);
          return;
        }

        // Skip if status indicates no data found
        if (tracking.originalStatus === 'Data does not exists' || tracking.originalStatus === 'No data found') {
          console.log(`Skipping AWB ${tracking.awbNumber} - No data available in Delhivery system`);
          return;
        }

        const mappedStatus = statusMappingService.mapOrderStatus(tracking.originalStatus);
        
        // Only update if we got a valid status from the API
        if (mappedStatus === 'unknown' || mappedStatus === 'pending') {
          console.log(`Skipping update for AWB: ${tracking.awbNumber} - Invalid status: ${tracking.originalStatus}`);
          return;
        }
        
        const updateData = {
          deliveryStatus: mappedStatus,
          currentLocation: tracking.currentLocation,
          lastTrackingUpdate: new Date(),
          trackingData: tracking,
          actualDeliveryDate: tracking.deliveredDate || null,
          estimatedDeliveryDate: tracking.estimatedDelivery || null
        };

        // Update DropshipOrder
        await DropshipOrder.updateOne(
          { fwdAwb: tracking.awbNumber },
          { $set: updateData }
        );

        // Update RtvReturn if exists
        await RtvReturn.updateOne(
          { trackingNumber: tracking.awbNumber },
          { $set: updateData }
        );

        console.log(`Updated tracking for AWB: ${tracking.awbNumber} - Status: ${mappedStatus}`);
        
      } catch (error) {
        console.error(`Error updating tracking for AWB ${tracking?.awbNumber || 'unknown'}:`, error);
      }
    });

    await Promise.all(updatePromises);
  }


  // Get tracking status for specific AWB numbers
  async getTrackingStatus(awbNumbers) {
    try {
      const htmlMap = await reportProcessor.fetchDelhiveryHtmlStatuses(awbNumbers);

      const trackingData = awbNumbers.map(awb => {
        const html = htmlMap[awb] || '';
        const status = reportProcessor.mapDelhiveryHtmlToOrderStatus(html);
        return {
          awbNumber: awb,
          status: status,
          originalStatus: status,
          currentLocation: undefined,
          lastUpdated: new Date()
        };
      });

      return {
        success: true,
        data: {
          total: trackingData.length,
          statusCounts: this.getStatusCounts(trackingData),
          shipments: trackingData.map(shipment => ({
            awbNumber: shipment.awbNumber,
            status: shipment.status,
            originalStatus: shipment.originalStatus,
            currentLocation: shipment.currentLocation,
            lastUpdated: shipment.lastUpdated
          }))
        }
      };
    } catch (error) {
      console.error('Error getting tracking status:', error);
      throw error;
    }
  }

  // Get status counts from tracking data
  getStatusCounts(trackingData) {
    const counts = {
      delivered: 0,
      in_transit: 0,
      out_for_delivery: 0,
      exception: 0,
      undelivered: 0,
      rto: 0,
      pending: 0
    };

    trackingData.forEach(shipment => {
      const status = shipment.status;
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      } else {
        counts.pending++;
      }
    });

    return counts;
  }

  // Get real-time dashboard data
  async getRealTimeDashboardData() {
    try {
      const [
        totalAwbs,
        pendingUpdates,
        recentUpdates,
        statusDistribution
      ] = await Promise.all([
        this.getTotalAwbsCount(),
        this.getPendingUpdatesCount(),
        this.getRecentUpdates(),
        this.getStatusDistribution()
      ]);

      return {
        totalAwbs,
        pendingUpdates,
        recentUpdates,
        statusDistribution,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('Error getting real-time dashboard data:', error);
      throw error;
    }
  }

  // Helper methods
  async getTotalAwbsCount() {
    return await DropshipOrder.countDocuments({
      fwdAwb: { $exists: true, $ne: null, $ne: '' }
    });
  }

  async getPendingUpdatesCount() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return await DropshipOrder.countDocuments({
      fwdAwb: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { lastTrackingUpdate: { $exists: false } },
        { lastTrackingUpdate: { $lt: oneHourAgo } }
      ]
    });
  }

  async getRecentUpdates() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return await DropshipOrder.find({
      lastTrackingUpdate: { $gte: oneHourAgo }
    })
    .select('fwdAwb deliveryStatus currentLocation lastTrackingUpdate')
    .sort({ lastTrackingUpdate: -1 })
    .limit(10);
  }

  async getStatusDistribution() {
    const pipeline = [
      {
        $match: {
          fwdAwb: { $exists: true, $ne: null, $ne: '' },
          deliveryStatus: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$deliveryStatus',
          count: { $sum: 1 }
        }
      }
    ];

    const result = await DropshipOrder.aggregate(pipeline);
    
    const distribution = {};
    result.forEach(item => {
      distribution[item._id] = item.count;
    });

    return distribution;
  }
}

module.exports = new RealTimeUpdateService();
