import React from 'react';
import { CheckCircle, Truck, AlertCircle, Clock, Package, XCircle, RotateCcw } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  // Order statuses
  delivered: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    iconColor: 'text-green-500'
  },
  in_transit: {
    icon: Truck,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    iconColor: 'text-blue-500'
  },
  out_for_delivery: {
    icon: Truck,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    iconColor: 'text-orange-500'
  },
  exception: {
    icon: AlertCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    iconColor: 'text-red-500'
  },
  undelivered: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    iconColor: 'text-red-500'
  },
  rto: {
    icon: RotateCcw,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    iconColor: 'text-purple-500'
  },
  rto_delivered: {
    icon: CheckCircle,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    iconColor: 'text-purple-500'
  },
  pending: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    iconColor: 'text-yellow-500'
  },
  picked_up: {
    icon: Package,
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    iconColor: 'text-indigo-500'
  },
  dispatched: {
    icon: Truck,
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    iconColor: 'text-indigo-500'
  },
  cancelled: {
    icon: XCircle,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    iconColor: 'text-gray-500'
  },
  returned: {
    icon: RotateCcw,
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
    iconColor: 'text-pink-500'
  },
  refunded: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    iconColor: 'text-green-500'
  },
  
  // Return statuses
  initiated: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    iconColor: 'text-yellow-500'
  },
  pickup_scheduled: {
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    iconColor: 'text-blue-500'
  },
  delivered_to_warehouse: {
    icon: Package,
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    iconColor: 'text-indigo-500'
  },
  quality_check: {
    icon: AlertCircle,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    iconColor: 'text-orange-500'
  },
  replaced: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    iconColor: 'text-green-500'
  },
  rejected: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    iconColor: 'text-red-500'
  },
  processing: {
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    iconColor: 'text-blue-500'
  },
  completed: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    iconColor: 'text-green-500'
  },
  failed: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    iconColor: 'text-red-500'
  }
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md', 
  showIcon = true, 
  className = '' 
}) => {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
  const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || {
    icon: Package,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    iconColor: 'text-gray-500'
  };

  const Icon = config.icon;
  const displayText = status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeClasses[size]} ${className}`}>
      {showIcon && <Icon className={`h-3 w-3 ${config.iconColor}`} />}
      {displayText}
    </span>
  );
};

export default StatusBadge;