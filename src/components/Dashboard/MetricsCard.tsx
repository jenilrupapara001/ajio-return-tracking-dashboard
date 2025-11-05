import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative';
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  changeType,
  icon,
  color
}) => {
  const iconBgClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {changeType === 'positive' ? (
                <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {Math.abs(change)}% from last month
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconBgClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};