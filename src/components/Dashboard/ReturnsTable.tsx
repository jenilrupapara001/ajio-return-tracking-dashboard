import React from 'react';
import { Package, ExternalLink, Eye } from 'lucide-react';
import { Return } from '../../types/dashboard';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface ReturnsTableProps {
  returns: Return[];
  onViewDetails: (returnItem: Return) => void;
}

export const ReturnsTable: React.FC<ReturnsTableProps> = ({ returns, onViewDetails }) => {
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
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Return Tracking
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Return Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shipping Partner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {returns.map((returnItem) => (
              <tr key={returnItem.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{returnItem.id}</div>
                    <div className="text-sm text-gray-500">Order: {returnItem.orderId}</div>
                    <div className="text-sm text-gray-500">{returnItem.productName}</div>
                    <div className="text-xs text-gray-400 mt-1">{returnItem.returnReason}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{returnItem.customerName}</div>
                    <div className="text-sm text-gray-500">{returnItem.customerEmail}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={returnItem.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{getPartnerName(returnItem.shippingPartner)}</div>
                    <div className="text-sm text-gray-500">{returnItem.trackingNumber}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <PriorityBadge priority={returnItem.priority} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{formatCurrency(returnItem.refundAmount)}</div>
                  <div className="text-xs text-gray-500">Expected: {formatDate(returnItem.expectedDelivery)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => onViewDetails(returnItem)}
                    className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                  <a
                    href={`#track/${returnItem.trackingNumber}`}
                    className="text-green-600 hover:text-green-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Track
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
