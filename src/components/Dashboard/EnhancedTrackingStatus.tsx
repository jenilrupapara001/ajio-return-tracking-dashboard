/**
 * Enhanced Tracking Status Component
 * 
 * This component integrates the new Delhivery public tracking API
 * with your existing Orders and RTV components.
 */

import React, { useState } from 'react';
import { Package, Truck, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLiveTracking } from '../../hooks/useLiveTracking';
import { liveTrackingService } from '../../services/liveTrackingService';

interface EnhancedTrackingStatusProps {
  /** Order ID to track */
  orderId: string;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Whether to auto-refresh */
  autoRefresh?: boolean;
  /** Custom CSS class */
  className?: string;
}

export const EnhancedTrackingStatus: React.FC<EnhancedTrackingStatusProps> = ({
  orderId,
  compact = false,
  autoRefresh = false,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Use the live tracking hook
  const { data, loading, error, refresh, isAutoRefresh, setAutoRefresh } = useLiveTracking({
    orderId,
    autoRefresh,
    refreshInterval: 30000, // 30 seconds
    immediate: true
  });

  /**
   * Handle manual refresh
   */
  const handleRefresh = async () => {
    try {
      await refresh();
      toast.success('Tracking data refreshed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to refresh tracking data');
    }
  };

  /**
   * Get status icon based on status
   */
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

  /**
   * Get status color classes
   */
  const getStatusColor = (status: string) => {
    return liveTrackingService.getStatusColor(status);
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string | Date) => {
    return liveTrackingService.formatTimestamp(timestamp);
  };

  // Get current tracking data
  const trackingData = data?.trackingData;
  const currentError = error;
  const currentLoading = loading;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {!trackingData && !currentLoading && (
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            <Package className="h-3 w-3" />
            Track
          </button>
        )}
        
        {currentLoading && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
            Tracking...
          </div>
        )}
        
        {trackingData && (
          <div className="flex items-center gap-2">
            {getStatusIcon(trackingData.status)}
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(trackingData.status)}`}>
              {liveTrackingService.formatStatus(trackingData.status)}
            </span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-500 hover:text-gray-700"
            >
              {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
        )}
        
        {currentError && (
          <div className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="h-3 w-3" />
            Error
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Track Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          disabled={currentLoading}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {currentLoading ? (
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
        
        {trackingData && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        )}

        <button
          onClick={() => setAutoRefresh(!isAutoRefresh)}
          className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isAutoRefresh 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isAutoRefresh ? 'animate-spin' : ''}`} />
          {isAutoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
        </button>
      </div>

      {/* Error Message */}
      {currentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-red-700 text-sm font-medium">Tracking Error</p>
              <p className="text-red-600 text-xs">{currentError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Package Status */}
      {trackingData && (
        <div className="space-y-3">
          {/* Status Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Package Status</h3>
              <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(trackingData.status)}`}>
                {liveTrackingService.formatStatus(trackingData.status)}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {getStatusIcon(trackingData.status)}
                <div>
                  <p className="text-gray-600 text-xs">Status</p>
                  <p className="font-medium text-gray-900">{liveTrackingService.formatStatus(trackingData.status)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-600 text-xs">Location</p>
                  <p className="font-medium text-gray-900">{trackingData.currentLocation}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-600 text-xs">Last Update</p>
                  <p className="font-medium text-gray-900">{formatTimestamp(trackingData.lastUpdated)}</p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-600">AWB Number</p>
                  <p className="font-mono font-medium">{trackingData.awbNumber}</p>
                </div>
                {orderId && (
                  <div>
                    <p className="text-gray-600">Order ID</p>
                    <p className="font-medium">{orderId}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">Origin</p>
                  <p className="font-medium">{trackingData.origin}</p>
                </div>
                <div>
                  <p className="text-gray-600">Destination</p>
                  <p className="font-medium">{trackingData.destination}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Tracking History */}
          {showDetails && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Tracking History</h4>
              <div className="space-y-3">
                {trackingData.trackingHistory.map((event, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      {index < trackingData.trackingHistory.length - 1 && (
                        <div className="w-px h-6 bg-gray-200 ml-1"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 text-sm">{event.status}</p>
                        <p className="text-xs text-gray-500">{formatTimestamp(event.timestamp)}</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{event.location}</p>
                      {event.remarks && (
                        <p className="text-xs text-gray-500 mt-1">{event.remarks}</p>
                      )}
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

export default EnhancedTrackingStatus;
