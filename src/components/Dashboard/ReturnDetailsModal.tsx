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
    return new Date(dateString).toLocaleDateString('en-IN', {
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
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
