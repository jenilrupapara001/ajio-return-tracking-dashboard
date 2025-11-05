import React, { useState, useEffect } from 'react';
import { RefreshCw, Package, Truck, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface TrackingData {
  awbNumber: string;
  status: string;
  originalStatus: string;
  currentLocation: string;
  lastUpdated: string;
}

interface RealTimeTrackingProps {
  awbNumbers: string[];
  onStatusUpdate?: (data: TrackingData[]) => void;
}

const statusIcons = {
  delivered: <CheckCircle className="h-5 w-5 text-green-500" />,
  in_transit: <Truck className="h-5 w-5 text-blue-500" />,
  out_for_delivery: <Truck className="h-5 w-5 text-orange-500" />,
  exception: <AlertCircle className="h-5 w-5 text-red-500" />,
  pending: <Clock className="h-5 w-5 text-gray-500" />,
  default: <Package className="h-5 w-5 text-gray-500" />
};

const statusColors = {
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  in_transit: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  out_for_delivery: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  exception: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
};

export const RealTimeTracking: React.FC<RealTimeTrackingProps> = ({ awbNumbers, onStatusUpdate }) => {
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchTrackingStatus = async () => {
    if (awbNumbers.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/tracking-status?awbNumbers=${awbNumbers.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.shipments) {
          const formattedData = data.data.shipments.map((shipment: any) => ({
            awbNumber: shipment.awbNumber,
            status: shipment.status,
            originalStatus: shipment.originalStatus,
            currentLocation: shipment.currentLocation,
            lastUpdated: new Date(shipment.lastUpdated).toLocaleString()
          }));
          
          setTrackingData(formattedData);
          setLastUpdate(new Date());
          onStatusUpdate?.(formattedData);
        }
      }
    } catch (error) {
      console.error('Error fetching tracking status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingStatus();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchTrackingStatus, 30000);
    return () => clearInterval(interval);
  }, [awbNumbers.join(',')]);

  const getStatusIcon = (status: string) => {
    return statusIcons[status as keyof typeof statusIcons] || statusIcons.default;
  };

  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || statusColors.default;
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Real-Time Tracking Status</h3>
        <button
          onClick={fetchTrackingStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {lastUpdate && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Last updated: {lastUpdate.toLocaleString()}
        </p>
      )}

      {trackingData.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No tracking data available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trackingData.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center gap-4">
                {getStatusIcon(item.status)}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.awbNumber}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.currentLocation || 'Location not available'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  {formatStatus(item.status)}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {item.lastUpdated}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RealTimeTracking;
