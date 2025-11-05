/**
 * Live Tracking Service (Frontend)
 * 
 * This service handles real-time tracking updates from the backend API
 * and provides a clean interface for frontend components.
 */

import axios from 'axios';

export interface TrackingData {
  success: boolean;
  awbNumber: string;
  status: string;
  currentLocation: string;
  lastUpdated: Date;
  origin: string;
  destination: string;
  trackingHistory: TrackingEvent[];
  rawData?: any;
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  location: string;
  remarks: string;
  source: string;
}

export interface TrackingResult {
  success: boolean;
  orderId: string;
  awbNumber: string;
  trackingData: TrackingData | null;
  error?: string;
  lastUpdated: Date;
}

export interface BulkTrackingResult {
  success: boolean;
  total: number;
  successful: number;
  errors: number;
  results: TrackingResult[];
}

class LiveTrackingService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/live-tracking';
  }

  /**
   * Get tracking data for a single order
   */
  async getOrderTracking(orderId: string): Promise<TrackingResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      return {
        success: true,
        orderId: response.data.orderId,
        awbNumber: response.data.awbNumber,
        trackingData: response.data.trackingData,
        lastUpdated: new Date(response.data.lastUpdated)
      };
    } catch (error: any) {
      console.error(`Error fetching tracking for order ${orderId}:`, error);
      
      return {
        success: false,
        orderId,
        awbNumber: '',
        trackingData: null,
        error: error.response?.data?.error || error.message || 'Failed to fetch tracking data',
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Bulk update tracking for multiple orders
   */
  async bulkUpdateTracking(orderIds: string[]): Promise<BulkTrackingResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/bulk`, {
        orderIds
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      return {
        success: true,
        total: response.data.total,
        successful: response.data.successful,
        errors: response.data.errors,
        results: response.data.results
      };
    } catch (error: any) {
      console.error('Error in bulk tracking update:', error);
      
      return {
        success: false,
        total: orderIds.length,
        successful: 0,
        errors: orderIds.length,
        results: orderIds.map(orderId => ({
          success: false,
          orderId,
          awbNumber: '',
          trackingData: null,
          error: error.response?.data?.error || error.message || 'Bulk update failed',
          lastUpdated: new Date()
        }))
      };
    }
  }

  /**
   * Trigger auto-update for orders needing tracking updates
   */
  async triggerAutoUpdate(): Promise<{ success: boolean; message: string; total?: number; successful?: number; errors?: number }> {
    try {
      const response = await axios.post(`${this.baseUrl}/auto-update`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      return {
        success: true,
        message: response.data.message,
        total: response.data.total,
        successful: response.data.successful,
        errors: response.data.errors
      };
    } catch (error: any) {
      console.error('Error triggering auto-update:', error);
      
      return {
        success: false,
        message: error.response?.data?.error || error.message || 'Auto-update failed'
      };
    }
  }

  /**
   * Get orders that need tracking updates
   */
  async getPendingOrders(limit: number = 50): Promise<{ success: boolean; count: number; orders: any[] }> {
    try {
      const response = await axios.get(`${this.baseUrl}/pending?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      return {
        success: true,
        count: response.data.count,
        orders: response.data.orders
      };
    } catch (error: any) {
      console.error('Error getting pending orders:', error);
      
      return {
        success: false,
        count: 0,
        orders: []
      };
    }
  }

  /**
   * Format tracking status for display
   */
  formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'delivered': 'Delivered',
      'out_for_delivery': 'Out for Delivery',
      'in_transit': 'In Transit',
      'picked_up': 'Picked Up',
      'dispatched': 'Dispatched',
      'pending': 'Pending',
      'exception': 'Exception',
      'undelivered': 'Undelivered',
      'rto': 'Return to Origin',
      'rto_delivered': 'RTO Delivered'
    };

    return statusMap[status.toLowerCase()] || status;
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: string): string {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('delivered')) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (statusLower.includes('cancelled') || statusLower.includes('exception') || statusLower.includes('undelivered')) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (statusLower.includes('pending') || statusLower.includes('processing')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else if (statusLower.includes('transit') || statusLower.includes('dispatched') || statusLower.includes('picked')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: Date | string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export const liveTrackingService = new LiveTrackingService();
export default liveTrackingService;
