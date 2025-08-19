export interface Return {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  returnReason: string;
  status: 'initiated' | 'pickup_scheduled' | 'in_transit' | 'delivered_to_warehouse' | 'quality_check' | 'refunded' | 'replaced' | 'rejected';
  shippingPartner: 'bluedart' | 'delhivery' | 'ecom' | 'fedex' | 'dtdc';
  trackingNumber: string;
  initiatedDate: string;
  expectedDelivery: string;
  refundAmount: number;
  priority: 'high' | 'medium' | 'low';
}

export interface DashboardMetrics {
  totalReturns: number;
  pendingReturns: number;
  completedReturns: number;
  totalRefundAmount: number;
  avgProcessingTime: number;
  successRate: number;
}

export interface ShippingPartner {
  id: string;
  name: string;
  logo: string;
  activeReturns: number;
  averageDeliveryTime: number;
  successRate: number;
  status: 'active' | 'inactive';
}

export interface FilterOptions {
  status: string;
  partner: string;
  priority: string;
  dateRange: string;
  searchQuery: string;
}