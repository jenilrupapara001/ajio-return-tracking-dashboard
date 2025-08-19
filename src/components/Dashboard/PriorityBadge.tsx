import React from 'react';

interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return { color: 'bg-red-100 text-red-900 border-red-200', label: 'High', dot: 'bg-red-500' };
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium', dot: 'bg-yellow-500' };
      case 'low':
        return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Low', dot: 'bg-green-500' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: priority, dot: 'bg-gray-500' };
    }
  };

  const config = getPriorityConfig(priority);

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${config.color}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></div>
      {config.label}
    </div>
  );
};