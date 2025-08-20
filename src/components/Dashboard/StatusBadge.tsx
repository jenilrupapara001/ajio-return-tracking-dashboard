import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'initiated':
        return { color: 'bg-gray-100 text-gray-800', label: 'Initiated' };
      case 'pickup_scheduled':
        return { color: 'bg-blue-100 text-blue-800', label: 'Pickup Scheduled' };
      case 'in_transit':
        return { color: 'bg-yellow-100 text-yellow-800', label: 'In Transit' };
      case 'delivered_to_warehouse':
        return { color: 'bg-purple-100 text-purple-800', label: 'At Warehouse' };
      case 'quality_check':
        return { color: 'bg-orange-100 text-orange-800', label: 'Quality Check' };
      case 'refunded':
        return { color: 'bg-green-100 text-green-800', label: 'Refunded' };
      case 'replaced':
        return { color: 'bg-cyan-100 text-cyan-800', label: 'Replaced' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', label: 'Rejected' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};
