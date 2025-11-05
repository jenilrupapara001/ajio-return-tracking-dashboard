/**
 * Demo component for Delhivery Tracking Integration
 * 
 * This component demonstrates how to use the Delhivery tracking API
 * with both real and mock data. It's perfect for testing and development.
 */

import React, { useState } from 'react';
import { useDelhiveryTracking } from '../hooks/useDelhiveryTracking';
import { trackDelhiveryShipmentWithMock } from '../services/delhiveryMockData';
import { getMockAWBNumbers } from '../services/delhiveryMockData';
import { DelhiveryApiResponse, DelhiveryApiError } from '../types/delhivery';

interface DelhiveryTrackingDemoProps {
  /** Whether to use mock data by default */
  useMock?: boolean;
  /** Custom CSS class */
  className?: string;
}

export const DelhiveryTrackingDemo: React.FC<DelhiveryTrackingDemoProps> = ({
  useMock = false,
  className = ''
}) => {
  const [awbInput, setAwbInput] = useState('');
  const [useMockData, setUseMockData] = useState(useMock);
  const [manualResult, setManualResult] = useState<DelhiveryApiResponse | null>(null);
  const [manualError, setManualError] = useState<DelhiveryApiError | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  // Use the hook for automatic tracking
  const { data, loading, error, trackAWB, clear } = useDelhiveryTracking();

  // Mock AWB numbers for quick testing
  const mockAWBs = getMockAWBNumbers();

  /**
   * Handle manual tracking with mock/real data toggle
   */
  const handleManualTrack = async () => {
    if (!awbInput.trim()) return;

    setManualLoading(true);
    setManualError(null);
    setManualResult(null);

    try {
      const result = await trackDelhiveryShipmentWithMock(awbInput, {}, useMockData);
      setManualResult(result);
    } catch (err) {
      setManualError(err as DelhiveryApiError);
    } finally {
      setManualLoading(false);
    }
  };

  /**
   * Handle quick track with mock AWB
   */
  const handleQuickTrack = (awb: string) => {
    setAwbInput(awb);
    trackAWB(awb);
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`delhivery-tracking-demo ${className}`}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Delhivery Tracking API Demo
          </h1>
          <p className="text-gray-600">
            Test the Delhivery public tracking API integration
          </p>
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useMockData}
                onChange={(e) => setUseMockData(e.target.checked)}
                className="mr-2"
              />
              Use Mock Data
            </label>
            <button
              onClick={clear}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Quick Test Buttons */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Test (Mock Data)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockAWBs.map((awb) => (
              <button
                key={awb}
                onClick={() => handleQuickTrack(awb)}
                className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg text-left transition-colors"
              >
                <div className="font-mono text-sm">{awb}</div>
                <div className="text-xs text-gray-600">
                  {awb === '123456789012' && 'Delivered'}
                  {awb === '987654321098' && 'In Transit'}
                  {awb === '555555555555' && 'Pending'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Input */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Manual Tracking</h2>
          <div className="flex space-x-4">
            <input
              type="text"
              value={awbInput}
              onChange={(e) => setAwbInput(e.target.value)}
              placeholder="Enter AWB number (e.g., 123456789012)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleManualTrack}
              disabled={manualLoading || !awbInput.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {manualLoading ? 'Tracking...' : 'Track'}
            </button>
          </div>
        </div>

        {/* Hook Results */}
        {data && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Hook Results</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <span className="font-medium">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  data.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {data.success ? 'Success' : 'Error'}
                </span>
                {loading && <span className="text-blue-600">Loading...</span>}
              </div>
              
              {data.shipment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Shipment Details</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>AWB:</strong> {data.shipment.awbNumber}</div>
                      <div><strong>Status:</strong> {data.shipment.status}</div>
                      <div><strong>Location:</strong> {data.shipment.currentLocation}</div>
                      <div><strong>Origin:</strong> {data.shipment.origin}</div>
                      <div><strong>Destination:</strong> {data.shipment.destination}</div>
                      {data.shipment.consigneeName && (
                        <div><strong>Consignee:</strong> {data.shipment.consigneeName}</div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Tracking History</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {data.shipment.trackingHistory.map((event, index) => (
                        <div key={index} className="text-xs border-l-2 border-blue-200 pl-2">
                          <div className="font-medium">{event.status}</div>
                          <div className="text-gray-600">{event.location}</div>
                          <div className="text-gray-500">{formatTimestamp(event.timestamp)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Results */}
        {manualResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Manual Results</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <span className="font-medium">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  manualResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {manualResult.success ? 'Success' : 'Error'}
                </span>
                {manualLoading && <span className="text-blue-600">Loading...</span>}
              </div>
              
              {manualResult.shipment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Shipment Details</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>AWB:</strong> {manualResult.shipment.awbNumber}</div>
                      <div><strong>Status:</strong> {manualResult.shipment.status}</div>
                      <div><strong>Location:</strong> {manualResult.shipment.currentLocation}</div>
                      <div><strong>Origin:</strong> {manualResult.shipment.origin}</div>
                      <div><strong>Destination:</strong> {manualResult.shipment.destination}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Tracking History</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {manualResult.shipment.trackingHistory.map((event, index) => (
                        <div key={index} className="text-xs border-l-2 border-blue-200 pl-2">
                          <div className="font-medium">{event.status}</div>
                          <div className="text-gray-600">{event.location}</div>
                          <div className="text-gray-500">{formatTimestamp(event.timestamp)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {(error || manualError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-4">Error</h2>
            <div className="space-y-2 text-sm">
              {error && (
                <div>
                  <div><strong>Code:</strong> {error.code}</div>
                  <div><strong>Message:</strong> {error.message}</div>
                  <div><strong>AWB:</strong> {error.awbNumber}</div>
                </div>
              )}
              {manualError && (
                <div>
                  <div><strong>Code:</strong> {manualError.code}</div>
                  <div><strong>Message:</strong> {manualError.message}</div>
                  <div><strong>AWB:</strong> {manualError.awbNumber}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Usage Instructions</h2>
          <div className="space-y-2 text-sm text-blue-700">
            <div>• <strong>Mock Data:</strong> Use the checkbox to toggle between real API and mock data</div>
            <div>• <strong>Quick Test:</strong> Click on the mock AWB buttons to test different scenarios</div>
            <div>• <strong>Manual Input:</strong> Enter any AWB number to test real API calls</div>
            <div>• <strong>Real API:</strong> Uncheck "Use Mock Data" and enter real AWB numbers</div>
            <div>• <strong>Environment:</strong> Set VITE_USE_DELHIVERY_MOCK=true in .env for default mock mode</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DelhiveryTrackingDemo;
