// Status mapping service for order reports and tracking data

class StatusMappingService {
  constructor() {
    // Order status mapping from various sources to standardized statuses
    this.orderStatusMap = {
      // Delhivery statuses
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
      
      // Common order statuses
      'Shipped': 'in_transit',
      'Processing': 'pending',
      'Ready to Ship': 'pending',
      'Cancelled': 'cancelled',
      'Returned': 'returned',
      'Refunded': 'refunded',
      
      // Ajio specific statuses
      'Order Confirmed': 'pending',
      'Packed': 'pending',
      'Shipped': 'in_transit',
      'Out for Delivery': 'out_for_delivery',
      'Delivered': 'delivered',
      'Cancelled by Customer': 'cancelled',
      'Cancelled by Seller': 'cancelled',
      'Cancelled by System': 'cancelled',
      'Return Initiated': 'return_initiated',
      'Return Picked Up': 'return_picked_up',
      'Return Delivered': 'return_delivered',
      'Return Processed': 'return_processed',
      'Refund Processed': 'refund_processed',
      
      // Generic statuses
      'Pending': 'pending',
      'Active': 'active',
      'Completed': 'completed',
      'Failed': 'failed',
      'Error': 'error',
      'Success': 'success'
    };

    // Return status mapping
    this.returnStatusMap = {
      'Initiated': 'initiated',
      'Pickup Scheduled': 'pickup_scheduled',
      'Picked Up': 'picked_up',
      'In Transit': 'in_transit',
      'Delivered to Warehouse': 'delivered_to_warehouse',
      'Quality Check': 'quality_check',
      'Refunded': 'refunded',
      'Replaced': 'replaced',
      'Rejected': 'rejected',
      'Processing': 'processing',
      'Completed': 'completed',
      'Failed': 'failed'
    };

    // Status display names for UI
    this.statusDisplayNames = {
      // Order statuses
      'pending': 'Pending',
      'picked_up': 'Picked Up',
      'dispatched': 'Dispatched',
      'in_transit': 'In Transit',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'exception': 'Exception',
      'undelivered': 'Undelivered',
      'rto': 'RTO',
      'rto_delivered': 'RTO Delivered',
      'cancelled': 'Cancelled',
      'returned': 'Returned',
      'refunded': 'Refunded',
      
      // Return statuses
      'initiated': 'Initiated',
      'pickup_scheduled': 'Pickup Scheduled',
      'delivered_to_warehouse': 'Delivered to Warehouse',
      'quality_check': 'Quality Check',
      'replaced': 'Replaced',
      'rejected': 'Rejected',
      'processing': 'Processing',
      'completed': 'Completed',
      'failed': 'Failed'
    };

    // Status colors for UI
    this.statusColors = {
      // Order statuses
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'picked_up': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'dispatched': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      'in_transit': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'out_for_delivery': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'delivered': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'exception': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'undelivered': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'rto': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'rto_delivered': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'cancelled': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      'returned': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
      'refunded': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      
      // Return statuses
      'initiated': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'pickup_scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'delivered_to_warehouse': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      'quality_check': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'replaced': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'processing': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'failed': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
  }

  // Map order status to standardized status
  mapOrderStatus(status) {
    if (!status) return 'pending';
    
    const normalizedStatus = String(status).trim();
    return this.orderStatusMap[normalizedStatus] || 'pending';
  }

  // Map return status to standardized status
  mapReturnStatus(status) {
    if (!status) return 'initiated';
    
    const normalizedStatus = String(status).trim();
    return this.returnStatusMap[normalizedStatus] || 'initiated';
  }

  // Get display name for status
  getStatusDisplayName(status) {
    return this.statusDisplayNames[status] || status;
  }

  // Get color class for status
  getStatusColor(status) {
    return this.statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }

  // Process order report data and map statuses
  processOrderReportData(orderData) {
    return {
      ...orderData,
      status: this.mapOrderStatus(orderData.status),
      deliveryStatus: this.mapOrderStatus(orderData.status),
      originalStatus: orderData.status
    };
  }

  // Process return report data and map statuses
  processReturnReportData(returnData) {
    return {
      ...returnData,
      status: this.mapReturnStatus(returnData.status),
      originalStatus: returnData.status
    };
  }

  // Get status statistics for dashboard
  getStatusStatistics(orders, returns) {
    const orderStats = {};
    const returnStats = {};

    // Count order statuses
    orders.forEach(order => {
      const status = this.mapOrderStatus(order.status);
      orderStats[status] = (orderStats[status] || 0) + 1;
    });

    // Count return statuses
    returns.forEach(returnItem => {
      const status = this.mapReturnStatus(returnItem.status);
      returnStats[status] = (returnStats[status] || 0) + 1;
    });

    return {
      orders: orderStats,
      returns: returnStats,
      totalOrders: orders.length,
      totalReturns: returns.length
    };
  }

  // Get status trends over time
  getStatusTrends(data, dateField = 'createdAt', statusField = 'status') {
    const trends = {};
    
    data.forEach(item => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      const status = this.mapOrderStatus(item[statusField]);
      
      if (!trends[date]) {
        trends[date] = {};
      }
      
      trends[date][status] = (trends[date][status] || 0) + 1;
    });

    return trends;
  }
}

module.exports = new StatusMappingService();
