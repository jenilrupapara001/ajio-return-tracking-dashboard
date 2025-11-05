const axios = require('axios');

class DelhiveryService {
  constructor() {
    // Use the working Delhivery API key
    this.apiKey = process.env.DELHIVERY_API_KEY || 'b0acf3cacb9f778456d1639c3dd26f9ff5a35af1';
    this.baseUrl = 'https://track.delhivery.com';
    this.webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhooks/delhivery';
    this.isEnabled = !!this.apiKey;
  }

  // Track shipment by AWB number
  async trackShipment(awbNumber) {
    if (!this.isEnabled) {
      console.log(`⚠️ Delhivery API disabled - no valid API key provided for AWB: ${awbNumber}`);
      return null;
    }

    try {
      console.log(`🔍 Tracking AWB: ${awbNumber} with Delhivery API`);
      
      const response = await axios.get(`${this.baseUrl}/api/v1/packages/json`, {
        params: {
          token: this.apiKey,
          waybill: awbNumber
        },
        timeout: 10000 // 10 second timeout
      });

      console.log(`📦 Delhivery API response for ${awbNumber}:`, {
        status: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        dataKeys: response.data ? Object.keys(response.data) : 'no data'
      });

      // Handle different response structures
      let shipments = [];
      if (Array.isArray(response.data)) {
        shipments = response.data;
      } else if (response.data && Array.isArray(response.data.shipments)) {
        shipments = response.data.shipments;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        shipments = response.data.data;
      } else if (response.data && response.data.packages && Array.isArray(response.data.packages)) {
        shipments = response.data.packages;
      }

      // Check for specific error messages
      if (response.data && response.data.Error) {
        console.log(`⚠️ Delhivery API error for AWB ${awbNumber}: ${response.data.Error}`);
        return null;
      }

      if (response.data && response.data.rmk && response.data.rmk.includes('Data does not exists')) {
        console.log(`⚠️ AWB ${awbNumber} not found in Delhivery system`);
        return null;
      }

      if (shipments && shipments.length > 0) {
        const trackingData = this.formatTrackingData(shipments[0]);
        console.log(`✅ Successfully tracked AWB ${awbNumber}:`, {
          status: trackingData.status,
          originalStatus: trackingData.originalStatus,
          location: trackingData.currentLocation
        });
        return trackingData;
      }
      
      console.log(`⚠️ No tracking data found for AWB: ${awbNumber}`);
      return null;
    } catch (error) {
      console.error(`❌ Error tracking AWB ${awbNumber}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return null; // Return null instead of throwing to prevent service interruption
    }
  }

  // Track multiple shipments by AWB numbers
  async trackMultipleShipments(awbNumbers) {
    if (!this.isEnabled) {
      console.log(`⚠️ Delhivery API disabled - no valid API key provided for ${awbNumbers.length} AWBs`);
      return [];
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/packages/json`, {
        params: {
          token: this.apiKey,
          waybill: awbNumbers.join(',')
        }
      });

      // Handle different response structures
      let shipments = [];
      if (Array.isArray(response.data)) {
        shipments = response.data;
      } else if (response.data && Array.isArray(response.data.shipments)) {
        shipments = response.data.shipments;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        shipments = response.data.data;
      } else {
        console.log('Unexpected response structure:', response.data);
        return [];
      }

      return shipments.map(shipment => this.formatTrackingData(shipment));
    } catch (error) {
      console.error('Error tracking multiple shipments:', error);
      // Return empty array instead of throwing to prevent service interruption
      return [];
    }
  }

  // Format tracking data to our standard format
  formatTrackingData(data) {
    if (!data) {
      return null;
    }

    const statusMapping = {
      'In Transit': 'in_transit',
      'Delivered': 'delivered',
      'Out for Delivery': 'out_for_delivery',
      'Picked Up': 'picked_up',
      'Dispatched': 'dispatched',
      'In Transit to Destination': 'in_transit',
      'Delivered to Consignee': 'delivered',
      'Exception': 'exception',
      'Undelivered': 'undelivered',
      'RTO': 'rto',
      'RTO Delivered': 'rto_delivered',
      'Pending': 'pending',
      'Cancelled': 'cancelled',
      'Booked': 'booked',
      'Collected': 'collected',
      'In Transit to Hub': 'in_transit',
      'Out for Pickup': 'out_for_pickup',
      'Delivered to Consignee': 'delivered',
      'Returned to Origin': 'rto',
      'Lost': 'lost',
      'Damaged': 'damaged'
    };

    // Handle different field name variations
    const awbNumber = data.AWB || data.waybill || data.trackingNumber || data.waybillNo || '';
    const status = data.Status || data.status || data.currentStatus || data.deliveryStatus || '';
    const location = data.Current_Status_Location || data.currentLocation || data.location || data.currentStatusLocation || '';
    const destination = data.Destination || data.destination || data.deliveryCity || '';
    const origin = data.Origin || data.origin || data.pickupCity || '';

    // Format tracking history
    let trackingHistory = [];
    if (data.Scan && Array.isArray(data.Scan)) {
      trackingHistory = data.Scan.map(scan => ({
        timestamp: scan.Scan_Date || scan.scanDate || scan.timestamp || new Date().toISOString(),
        location: scan.Scan_Location || scan.scanLocation || scan.location || '',
        status: scan.Status || scan.status || scan.scanStatus || '',
        description: scan.Remarks || scan.remarks || scan.description || scan.Status || scan.status || ''
      }));
    } else if (data.trackingHistory && Array.isArray(data.trackingHistory)) {
      trackingHistory = data.trackingHistory;
    }

    return {
      awbNumber,
      status: statusMapping[status] || 'unknown',
      originalStatus: status,
      currentLocation: location,
      destination,
      origin,
      pickupDate: data.Pickup_Date ? new Date(data.Pickup_Date) : null,
      deliveredDate: data.Delivery_Date ? new Date(data.Delivery_Date) : null,
      estimatedDelivery: data.Expected_Delivery_Date ? new Date(data.Expected_Delivery_Date) : null,
      trackingHistory,
      consigneeName: data.Consignee_Name || data.consigneeName || data.consignee || '',
      consigneeAddress: data.Consignee_Address || data.consigneeAddress || data.address || '',
      consigneePhone: data.Consignee_Phone || data.consigneePhone || data.phone || '',
      lastUpdated: new Date()
    };
  }

  // Set up webhook for real-time updates
  async setupWebhook() {
    try {
      const webhookData = {
        url: this.webhookUrl,
        events: ['shipment_created', 'shipment_dispatched', 'shipment_delivered', 'shipment_exception']
      };

      const response = await axios.post(`${this.baseUrl}/api/v1/webhooks`, webhookData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Webhook setup successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error setting up webhook:', error);
      throw error;
    }
  }

  // Process webhook data
  processWebhookData(webhookData) {
    return {
      eventType: webhookData.event_type,
      awbNumber: webhookData.waybill,
      status: webhookData.status,
      timestamp: new Date(webhookData.timestamp),
      location: webhookData.location,
      remarks: webhookData.remarks,
      rawData: webhookData
    };
  }

  // Get delivery status for dashboard
  async getDeliveryStatus(awbNumbers) {
    try {
      const shipments = await this.trackMultipleShipments(awbNumbers);
      
      const statusCounts = {
        delivered: 0,
        in_transit: 0,
        out_for_delivery: 0,
        exception: 0,
        undelivered: 0,
        rto: 0,
        unknown: 0
      };

      shipments.forEach(shipment => {
        statusCounts[shipment.status] = (statusCounts[shipment.status] || 0) + 1;
      });

      return {
        total: shipments.length,
        statusCounts,
        shipments: shipments.map(s => ({
          awbNumber: s.awbNumber,
          status: s.status,
          originalStatus: s.originalStatus,
          currentLocation: s.currentLocation,
          lastUpdated: s.lastUpdated
        }))
      };
    } catch (error) {
      console.error('Error getting delivery status:', error);
      throw error;
    }
  }
}

module.exports = new DelhiveryService();
