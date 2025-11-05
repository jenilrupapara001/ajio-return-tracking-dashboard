/**
 * Live Tracking Panel
 * 
 * This component shows the live tracking status and allows users to
 * trigger manual updates and see the real-time status from Delhivery API.
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Package, MapPin } from 'lucide-react';
import { useAutoUpdate } from '../../hooks/useLiveTracking';
import { liveTrackingService } from '../../services/liveTrackingService';

interface LiveTrackingPanelProps {
  className?: string;
}

export const LiveTrackingPanel: React.FC<LiveTrackingPanelProps> = ({ className = '' }) => {
  const { loading, error, lastUpdate, updateStats, triggerUpdate } = useAutoUpdate();
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes

  // Auto-refresh on mount
  useEffect(() => {
    triggerUpdate();
  }, [triggerUpdate]);

  // Set up periodic auto-refresh
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const interval = setInterval(() => {
      triggerUpdate();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled, refreshInterval, triggerUpdate]);

  const handleManualRefresh = async () => {
    await triggerUpdate();
  };

  const toggleAutoRefresh = () => {
    setIsAutoRefreshEnabled(!isAutoRefreshEnabled);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Live Tracking Status</h3>
          <p className="text-sm text-gray-600">Real-time updates from Delhivery API</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAutoRefresh}
            className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded transition-colors ${
              isAutoRefreshEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="h-4 w-4" />
            {isAutoRefreshEnabled ? 'Auto ON' : 'Auto OFF'}
          </button>
          
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-500 transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Display */}
      <div className="space-y-3">
        {loading && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-sm font-medium text-blue-800">Updating tracking data...</p>
              <p className="text-xs text-blue-600">Fetching latest status from Delhivery API</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">Update Error</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
        )}

        {updateStats && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-800">Update Complete</p>
              <p className="text-xs text-green-600">
                Successfully updated {updateStats.successful} of {updateStats.total} orders
                {updateStats.errors > 0 && (
                  <span className="text-red-600 ml-1">({updateStats.errors} errors)</span>
                )}
              </p>
            </div>
          </div>
        )}

        {lastUpdate && (
          <div className="text-xs text-gray-500">
            Last updated: {new Date(lastUpdate).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        )}

        {isAutoRefreshEnabled && (
          <div className="text-xs text-gray-500">
            Auto-refresh every {Math.round(refreshInterval / 60000)} minutes
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">How it works:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• <strong>Auto-refresh:</strong> Automatically updates tracking data every 5 minutes</li>
          <li>• <strong>Manual refresh:</strong> Click "Refresh Now" to get latest status immediately</li>
          <li>• <strong>Real-time status:</strong> Shows actual status from Delhivery API, not just "pending"</li>
          <li>• <strong>Database storage:</strong> All tracking data is stored in MongoDB for persistence</li>
        </ul>
      </div>
    </div>
  );
};

export default LiveTrackingPanel;
