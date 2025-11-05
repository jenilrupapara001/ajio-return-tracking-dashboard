import { Return, DashboardMetrics, ShippingPartner } from '../types/dashboard';

export const mockReturns: Return[] = [
  {
    id: 'RET001',
    orderId: 'AJO123456',
    customerName: 'Priya Sharma',
    customerEmail: 'priya.sharma@email.com',
    productName: 'Cotton Kurti - Blue',
    returnReason: 'Size mismatch',
    status: 'in_transit',
    shippingPartner: 'bluedart',
    trackingNumber: 'BD12345678',
    initiatedDate: '2025-01-10',
    expectedDelivery: '2025-01-15',
    refundAmount: 1299,
    priority: 'high'
  },
  {
    id: 'RET002',
    orderId: 'AJO123457',
    customerName: 'Raj Patel',
    customerEmail: 'raj.patel@email.com',
    productName: 'Denim Jeans - Black',
    returnReason: 'Defective product',
    status: 'quality_check',
    shippingPartner: 'delhivery',
    trackingNumber: 'DEL87654321',
    initiatedDate: '2025-01-08',
    expectedDelivery: '2025-01-12',
    refundAmount: 2499,
    priority: 'high'
  },
  {
    id: 'RET003',
    orderId: 'AJO123458',
    customerName: 'Ankita Singh',
    customerEmail: 'ankita.singh@email.com',
    productName: 'Floral Dress - Pink',
    returnReason: 'Not as described',
    status: 'refunded',
    shippingPartner: 'ecom',
    trackingNumber: 'ECM98765432',
    initiatedDate: '2025-01-05',
    expectedDelivery: '2025-01-10',
    refundAmount: 1899,
    priority: 'medium'
  },
  {
    id: 'RET004',
    orderId: 'AJO123459',
    customerName: 'Vikram Khanna',
    customerEmail: 'vikram.khanna@email.com',
    productName: 'Leather Jacket - Brown',
    returnReason: 'Wrong item sent',
    status: 'pickup_scheduled',
    shippingPartner: 'fedex',
    trackingNumber: 'FX11223344',
    initiatedDate: '2025-01-12',
    expectedDelivery: '2025-01-17',
    refundAmount: 5999,
    priority: 'high'
  },
  {
    id: 'RET005',
    orderId: 'AJO123460',
    customerName: 'Sneha Gupta',
    customerEmail: 'sneha.gupta@email.com',
    productName: 'Sports Shoes - White',
    returnReason: 'Size issue',
    status: 'delivered_to_warehouse',
    shippingPartner: 'dtdc',
    trackingNumber: 'DT55667788',
    initiatedDate: '2025-01-06',
    expectedDelivery: '2025-01-11',
    refundAmount: 3299,
    priority: 'medium'
  },
  {
    id: 'RET006',
    orderId: 'AJO123461',
    customerName: 'Arjun Mehta',
    customerEmail: 'arjun.mehta@email.com',
    productName: 'Formal Shirt - White',
    returnReason: 'Quality issues',
    status: 'initiated',
    shippingPartner: 'bluedart',
    trackingNumber: 'BD99887766',
    initiatedDate: '2025-01-13',
    expectedDelivery: '2025-01-18',
    refundAmount: 1799,
    priority: 'low'
  },
    {
    id: 'RET007',
    orderId: 'AJO123456',
    customerName: 'Akhil  Anandan',
    customerEmail: 'akhil.anandan@email.com',
    productName: 'Denim Jeans',
    returnReason: 'Size mismatch',
    status: 'delivered_to_warehouse',
    shippingPartner: 'delhivery',
    trackingNumber: 'BD12345678',
    initiatedDate: '2025-08-17',
    expectedDelivery: '2025-08-20',
    refundAmount: 5999,
    priority: 'high'
  }
];

export const mockMetrics: DashboardMetrics = {
  totalReturns: 156,
  pendingReturns: 42,
  completedReturns: 114,
  totalRefundAmount: 245600,
  avgProcessingTime: 5.2,
  successRate: 94.5
};

export const mockShippingPartners: ShippingPartner[] = [
  {
    id: 'bluedart',
    name: 'Blue Dart',
    logo: '🚚',
    activeReturns: 28,
    averageDeliveryTime: 4.5,
    successRate: 96.2,
    status: 'active'
  },
  {
    id: 'delhivery',
    name: 'Delhivery',
    logo: '🚚',
    activeReturns: 35,
    averageDeliveryTime: 5.1,
    successRate: 94.8,
    status: 'active'
  },
  {
    id: 'ecom',
    name: 'Ecom Express',
    logo: '📋',
    activeReturns: 22,
    averageDeliveryTime: 4.8,
    successRate: 93.5,
    status: 'active'
  },
  {
    id: 'fedex',
    name: 'FedEx',
    logo: '✈️',
    activeReturns: 18,
    averageDeliveryTime: 3.9,
    successRate: 97.1,
    status: 'active'
  },
  {
    id: 'dtdc',
    name: 'DTDC',
    logo: '🏃',
    activeReturns: 15,
    averageDeliveryTime: 5.8,
    successRate: 91.3,
    status: 'active'
  }
];