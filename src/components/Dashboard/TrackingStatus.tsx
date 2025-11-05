import React, { useState } from 'react';
import { Package, Truck, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TrackingStatusProps {
  orderId: string;
  compact?: boolean;
}

interface PackageStatus {
  awb: string;
  status: string;
  currentLocation: string;
  lastUpdate: string;
  estimatedDelivery?: string;
  trackingHistory: TrackingEvent[];
  isRealData?: boolean;
  source?: string;
}

interface TrackingEvent {
  timestamp: string;
  location: string;
  status: string;
  description: string;
}

const TrackingStatus: React.FC<TrackingStatusProps> = ({ orderId, compact = false }) => {
  const [packageStatus, setPackageStatus] = useState<PackageStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered') || statusLower.includes('completed')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (statusLower.includes('cancelled') || statusLower.includes('failed')) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else if (statusLower.includes('pending') || statusLower.includes('processing')) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    } else {
      return <Truck className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered') || statusLower.includes('completed')) {
      return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
    } else if (statusLower.includes('cancelled') || statusLower.includes('failed')) {
      return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
    } else if (statusLower.includes('pending') || statusLower.includes('processing')) {
      return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
    } else {
      return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
    }
  };

  const trackPackage = async () => {
    if (!orderId.trim()) {
      toast.error('Order ID is required');
      return;
    }

    setLoading(true);
    setError('');
    setPackageStatus(null);

    try {
      const response = await fetch(`/api/track-package/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPackageStatus(data);
        toast.success(`Package status retrieved from ${data.source || 'Delhivery'}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch package status');
      }
    } catch (error) {
      console.error('Error tracking package:', error);
      setError(error.message || 'Failed to track package');
      toast.error(error.message || 'Failed to track package');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {!packageStatus && !loading && (
          <button
            onClick={trackPackage}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Package className="h-3 w-3" />
            Track
          </button>
        )}
        
        {loading && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
            Tracking...
          </div>
        )}
        
        {packageStatus && (
          <div className="flex items-center gap-2">
            {getStatusIcon(packageStatus.status)}
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(packageStatus.status)}`}>
              {packageStatus.status}
            </span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="h-3 w-3" />
            Error
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Track Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={trackPackage}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Tracking...
            </>
          ) : (
            <>
              <Package className="w-4 h-4" />
              Track Package
            </>
          )}
        </button>
        
        {packageStatus && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Package Status */}
      {packageStatus && (
        <div className="space-y-3">
          {/* Status Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Package Status</h3>
              <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(packageStatus.status)}`}>
                {packageStatus.status}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {getStatusIcon(packageStatus.status)}
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">Status</p>
                  <p className="font-medium text-gray-900 dark:text-white">{packageStatus.status}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">Location</p>
                  <p className="font-medium text-gray-900 dark:text-white">{packageStatus.currentLocation}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">Last Update</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(packageStatus.lastUpdate)}</p>
                </div>
              </div>
            </div>

            {packageStatus.source && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Data source: {packageStatus.source}
              </div>
            )}
          </div>

          {/* Detailed Tracking History */}
          {showDetails && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Tracking History</h4>
              <div className="space-y-3">
                {packageStatus.trackingHistory.map((event, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      {index < packageStatus.trackingHistory.length - 1 && (
                        <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 ml-1"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{event.status}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(event.timestamp)}</p>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{event.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackingStatus;
