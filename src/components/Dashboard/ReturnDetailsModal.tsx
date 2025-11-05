import React from 'react';
import { X, Package, User, MapPin, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { Return } from '../../types/dashboard';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface ReturnDetailsModalProps {
  returnItem: Return | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReturnDetailsModal: React.FC<ReturnDetailsModalProps> = ({
  returnItem,
  isOpen,
  onClose
}) => {
  if (!isOpen || !returnItem) return null;

  const raw = (returnItem as any).raw || {} as Record<string, any>;

  const getRaw = (keys: string[], fallback: string | number | null = '—') => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') {
        return raw[k];
      }
    }
    return fallback;
  };

  const getPartnerName = (partner: string) => {
    const partners: Record<string, string> = {
      bluedart: 'Blue Dart',
      delhivery: 'Delhivery',
      ecom: 'Ecom Express',
      fedex: 'FedEx',
      dtdc: 'DTDC'
    };
    return partners[partner] || partner;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusTimeline = (status: string) => {
    const allStatuses = [
      { key: 'initiated', label: 'Return Initiated', completed: true },
      { key: 'pickup_scheduled', label: 'Pickup Scheduled', completed: ['pickup_scheduled', 'in_transit', 'delivered_to_warehouse', 'quality_check', 'refunded', 'replaced'].includes(status) },
      { key: 'in_transit', label: 'In Transit', completed: ['in_transit', 'delivered_to_warehouse', 'quality_check', 'refunded', 'replaced'].includes(status) },
      { key: 'delivered_to_warehouse', label: 'Delivered to Warehouse', completed: ['delivered_to_warehouse', 'quality_check', 'refunded', 'replaced'].includes(status) },
      { key: 'quality_check', label: 'Quality Check', completed: ['quality_check', 'refunded', 'replaced'].includes(status) },
      { key: 'refunded', label: 'Refunded', completed: status === 'refunded' }
    ];

    return allStatuses;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Return Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium text-gray-900">
                <Package className="h-5 w-5" />
                {returnItem.id}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-medium">{returnItem.orderId}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Product</p>
                <p className="font-medium">{returnItem.productName}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Return Reason</p>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span>{returnItem.returnReason}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium text-gray-900">
                <User className="h-5 w-5" />
                Customer Details
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{returnItem.customerName}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{returnItem.customerEmail}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Priority</p>
                <PriorityBadge priority={returnItem.priority} />
              </div>
            </div>
          </div>

          {/* Shipping & Status Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium text-gray-900">
                <MapPin className="h-5 w-5" />
                Shipping Details
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Partner</p>
                <p className="font-medium">{getPartnerName(returnItem.shippingPartner)}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Tracking Number</p>
                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{returnItem.trackingNumber}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Current Status</p>
                <StatusBadge status={returnItem.status} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium text-gray-900">
                <Clock className="h-5 w-5" />
                Timeline
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Initiated Date</p>
                <p className="font-medium">{formatDate(returnItem.initiatedDate)}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Expected Delivery</p>
                <p className="font-medium">{formatDate(returnItem.expectedDelivery)}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Refund Amount</p>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-green-600">{formatCurrency(returnItem.refundAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status Timeline</h3>
            <div className="space-y-4">
              {getStatusTimeline(returnItem.status).map((step, index) => (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    step.completed 
                      ? 'bg-green-500 border-green-500' 
                      : 'bg-gray-200 border-gray-300'
                  }`}>
                    {step.completed && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <span className={`${
                    step.completed ? 'text-gray-900 font-medium' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Product & Forward Shipment Details from upload */}
          <div className="pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Product Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-500">JioCode</div>
                <div className="font-medium">{String(getRaw(['JioCode']))}</div>
                <div className="text-gray-500">Seller SKU</div>
                <div className="font-medium">{String(getRaw(['SELLER SKU']))}</div>
                <div className="text-gray-500">Brand</div>
                <div className="font-medium">{String(getRaw(['BRAND']))}</div>
                <div className="text-gray-500">MRP</div>
                <div className="font-medium">{String(getRaw(['MRP']))}</div>
                <div className="text-gray-500">HSN</div>
                <div className="font-medium">{String(getRaw(['HSN']))}</div>
                <div className="text-gray-500">Return Type</div>
                <div className="font-medium">{String(getRaw(['Return Type']))}</div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Forward Shipment</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-500">FWD Seller Order ID</div>
                <div className="font-medium">{String(getRaw(['FWD Seller Order ID']))}</div>
                <div className="text-gray-500">FWD PO No</div>
                <div className="font-medium">{String(getRaw(['FWD PO No']))}</div>
                <div className="text-gray-500">FWD PO Date</div>
                <div className="font-medium">{String(getRaw(['FWD PO Date']))}</div>
                <div className="text-gray-500">FWD Carrier Name</div>
                <div className="font-medium">{String(getRaw(['FWD Carrier Name']))}</div>
                <div className="text-gray-500">FWD AWB</div>
                <div className="font-medium">{String(getRaw(['FWD AWB']))}</div>
                <div className="text-gray-500">FWD Invoice No</div>
                <div className="font-medium">{String(getRaw(['FWD B2B INVOICE No']))}</div>
                <div className="text-gray-500">FWD Invoice Date</div>
                <div className="font-medium">{String(getRaw(['FWD B2B INVOICE Date']))}</div>
                <div className="text-gray-500">FWD Invoice Amt</div>
                <div className="font-medium">{String(getRaw(['FWD B2B Invoice Amt']))}</div>
              </div>
            </div>
          </div>

          {/* Financials & Documents */}
          <div className="pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Financials</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-500">Return Value</div>
                <div className="font-medium">{String(getRaw(['Return Value']))}</div>
                <div className="text-gray-500">Credit Note Number</div>
                <div className="font-medium">{String(getRaw(['Credit Note Number']))}</div>
                <div className="text-gray-500">Credit Note Value</div>
                <div className="font-medium">{String(getRaw(['Credit Note Value']))}</div>
                <div className="text-gray-500">Pre-Tax Value</div>
                <div className="font-medium">{String(getRaw(['Credit Note Pre Tax Value']))}</div>
                <div className="text-gray-500">Tax Value</div>
                <div className="font-medium">{String(getRaw(['Credit Note Tax Value']))}</div>
                <div className="text-gray-500">CGST</div>
                <div className="font-medium">{String(getRaw(['CGST AMOUNT']))} ({String(getRaw(['CGST PERCENTAGE']))}%)</div>
                <div className="text-gray-500">SGST</div>
                <div className="font-medium">{String(getRaw(['SGST AMOUNT']))} ({String(getRaw(['SGST PERCENTAGE']))}%)</div>
                <div className="text-gray-500">IGST</div>
                <div className="font-medium">{String(getRaw(['IGST AMOUNT']))} ({String(getRaw(['IGST PERCENTAGE']))}%)</div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Documents</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-500">Delivery Challan No</div>
                <div className="font-medium">{String(getRaw(['Delivery Challan No']))}</div>
                <div className="text-gray-500">Challan Date</div>
                <div className="font-medium">{String(getRaw(['Delivery Challan Date']))}</div>
                <div className="text-gray-500">Challan Status</div>
                <div className="font-medium">{String(getRaw(['Delivery Challan Posting Status']))}</div>
                <div className="text-gray-500">Return Document No</div>
                <div className="font-medium">{String(getRaw(['Ret Doc No']))}</div>
              </div>
            </div>
          </div>

          {/* Extra Dates from upload */}
          <div className="pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Return Dates</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-500">Return Created Date</div>
                <div className="font-medium">{String(getRaw(['Return Created Date']))}</div>
                <div className="text-gray-500">Return Delivered Date</div>
                <div className="font-medium">{String(getRaw(['Return Delivered Date']))}</div>
                <div className="text-gray-500">3PL Delivery Status</div>
                <div className="font-medium">{String(getRaw(['3PL Delivery Status']))}</div>
                <div className="text-gray-500">Credit Note Gen Date</div>
                <div className="font-medium">{String(getRaw(['Credit Note Generation Date']))}</div>
              </div>
            </div>
          </div>

          {/* All Fields from Source (rawRow) */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">All Fields (from upload)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries((returnItem as any).raw || {}).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs uppercase text-gray-500">{key}</div>
                  <div className="text-sm font-medium text-gray-900 break-words">{String(value ?? '—')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};