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
  // Tracking information
  trackingData?: any;
  deliveryStatus?: string;
  currentLocation?: string;
  lastTrackingUpdate?: string;
  // Optional: complete original row and normalized keys, stored by backend
  raw?: Record<string, any>;
  normalized?: Record<string, any>;
}

export interface OrderReport {
  custOrderNo: string;
  custOrderDate: string;
  fwdSellerOrderNo: string;
  fwdPoNo: string;
  fwdPoDate: string;
  sellerInvoiceNo: string;
  sellerInvoiceDate: string;
  custInvoiceNo: string;
  custInvoiceDate: string;
  status: string;
  jioCode: string;
  hsn: string;
  sellerStyleCode: string;
  sellerSku: string;
  ean: string;
  description: string;
  orderQty: number;
  fwdShipmentId: string;
  fwdShipmentDate: string;
  fwdCarrier: string;
  fwdAwb: string;
  shippedQty: number;
  estimatedDispatchDate: string;
  slaStatus: string;
  cancelledQty: number;
  customerCancelledQty: number;
  sellerCancelledQty: number;
  listingMrp: number;
  sellerTd: number;
  sellingPrice: number;
  basePrice: number;
  totalPrice: number;
  cgstPercentage: number;
  cgstAmount: number;
  sgstPercentage: number;
  sgstAmount: number;
  igstPercentage: number;
  igstAmount: number;
  totalValue: number;
  invoiceValue: number;
  brand: string;
  fulfillmentType: string;
  pobId: string;
  sellerName: string;
  // Tracking information
  deliveryStatus?: 'pending' | 'picked_up' | 'dispatched' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'undelivered' | 'rto' | 'rto_delivered';
  currentLocation?: string;
  lastTrackingUpdate?: string;
  trackingData?: any;
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

// ===== ROLE-BASED PERMISSIONS TYPES =====

export interface Permission {
  _id: string;
  name: string;
  description: string;
  resource: 'users' | 'orders' | 'returns' | 'reports' | 'analytics' | 'settings' | 'uploads' | 'shipping';
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'view';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isActive: boolean;
  isSystem: boolean;
  level: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  customPermissions: Permission[];
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
  department: string;
  manager?: User;
  subordinates?: User[];
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
}

export interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
  level: number;
}

export interface PermissionFormData {
  name: string;
  description: string;
  resource: 'users' | 'orders' | 'returns' | 'reports' | 'analytics' | 'settings' | 'uploads' | 'shipping';
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'view';
}