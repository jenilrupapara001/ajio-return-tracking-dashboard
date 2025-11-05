/**
 * Auto Tracking Refresh Component
 * 
 * This component automatically refreshes tracking data for all visible orders
 * when the page loads and periodically updates them.
 */

import React, { useEffect, useState } from 'react';
import { useAutoUpdate } from '../../hooks/useLiveTracking';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface AutoTrackingRefreshProps {
  /** Whether to show the refresh controls */
  showControls?: boolean;
  /** Whether to auto-refresh on mount */
  autoRefreshOnMount?: boolean;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  /** Custom CSS class */
  className?: string;
}

export const AutoTrackingRefresh: React.FC<AutoTrackingRefreshProps> = ({
  showControls = true,
  autoRefreshOnMount = true,
  refreshInterval = 300000, // 5 minutes
  className = ''
}) => {
  const { loading, error, lastUpdate, updateStats, triggerUpdate } = useAutoUpdate();
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);

  /**
   * Auto-refresh on mount
   */
  useEffect(() => {
    if (autoRefreshOnMount) {
      triggerUpdate();
    }
  }, [autoRefreshOnMount, triggerUpdate]);

  /**
   * Set up periodic auto-refresh
   */
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const interval = setInterval(() => {
      triggerUpdate();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled, refreshInterval, triggerUpdate]);

  /**
   * Handle manual refresh
   */
  const handleRefresh = async () => {
    await triggerUpdate();
  };

  /**
   * Toggle auto-refresh
   */
  const toggleAutoRefresh = () => {
    setIsAutoRefreshEnabled(!isAutoRefreshEnabled);
  };

  if (!showControls) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Live Tracking Updates</h3>
          <p className="text-xs text-gray-600">Automatically refresh tracking data from Delhivery</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAutoRefresh}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition-colors ${
              isAutoRefreshEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="h-3 w-3" />
            {isAutoRefreshEnabled ? 'Auto ON' : 'Auto OFF'}
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-500 transition-colors"
          >
            {loading ? (
              <>
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                Refresh Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Display */}
      <div className="space-y-2">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Updating tracking data...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            Error: {error}
          </div>
        )}

        {updateStats && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Updated {updateStats.successful} of {updateStats.total} orders
            {updateStats.errors > 0 && (
              <span className="text-red-600">({updateStats.errors} errors)</span>
            )}
          </div>
        )}

        {lastUpdate && (
          <div className="text-xs text-gray-500">
            Last updated: {new Date(lastUpdate).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}

        {isAutoRefreshEnabled && (
          <div className="text-xs text-gray-500">
            Auto-refresh every {Math.round(refreshInterval / 60000)} minutes
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoTrackingRefresh;
