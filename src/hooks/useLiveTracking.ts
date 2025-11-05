/**
 * Live Tracking Hook
 * 
 * This hook provides real-time tracking functionality using the backend API
 * and automatically refreshes data when needed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { liveTrackingService, TrackingResult, TrackingData } from '../services/liveTrackingService';

export interface UseLiveTrackingResult {
  data: TrackingResult | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
  isAutoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
}

export interface UseLiveTrackingOptions {
  orderId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  immediate?: boolean; // fetch immediately on mount
}

export function useLiveTracking(options: UseLiveTrackingOptions = {}): UseLiveTrackingResult {
  const {
    orderId,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    immediate = true
  } = options;

  const [data, setData] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(autoRefresh);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);

  /**
   * Fetch tracking data for the order
   */
  const fetchTracking = useCallback(async (orderIdToFetch: string) => {
    if (!orderIdToFetch) return;

    setLoading(true);
    setError(null);

    try {
      const result = await liveTrackingService.getOrderTracking(orderIdToFetch);
      
      if (mountedRef.current) {
        setData(result);
        setLastUpdated(new Date());
        
        if (!result.success) {
          setError(result.error || 'Failed to fetch tracking data');
        }
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'An unexpected error occurred');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Refresh tracking data
   */
  const refresh = useCallback(async () => {
    if (orderId) {
      await fetchTracking(orderId);
    }
  }, [orderId, fetchTracking]);

  /**
   * Set auto-refresh state
   */
  const setAutoRefresh = useCallback((enabled: boolean) => {
    setIsAutoRefresh(enabled);
  }, []);

  /**
   * Setup auto-refresh interval
   */
  useEffect(() => {
    if (isAutoRefresh && orderId && !loading) {
      intervalRef.current = setInterval(() => {
        fetchTracking(orderId);
      }, refreshInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoRefresh, orderId, refreshInterval, fetchTracking, loading]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    if (immediate && orderId) {
      fetchTracking(orderId);
    }
  }, [immediate, orderId, fetchTracking]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdated,
    isAutoRefresh,
    setAutoRefresh
  };
}

/**
 * Hook for bulk tracking updates
 */
export interface UseBulkLiveTrackingResult {
  results: TrackingResult[];
  loading: boolean;
  error: string | null;
  updateTracking: (orderIds: string[]) => Promise<void>;
  lastUpdated: Date | null;
}

export function useBulkLiveTracking(): UseBulkLiveTrackingResult {
  const [results, setResults] = useState<TrackingResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const updateTracking = useCallback(async (orderIds: string[]) => {
    if (!orderIds || orderIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const bulkResult = await liveTrackingService.bulkUpdateTracking(orderIds);
      
      setResults(bulkResult.results);
      setLastUpdated(new Date());
      
      if (!bulkResult.success) {
        setError('Bulk update failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during bulk update');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    results,
    loading,
    error,
    updateTracking,
    lastUpdated
  };
}

/**
 * Hook for auto-updating all pending orders
 */
export interface UseAutoUpdateResult {
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  updateStats: { total: number; successful: number; errors: number } | null;
  triggerUpdate: () => Promise<void>;
}

export function useAutoUpdate(): UseAutoUpdateResult {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateStats, setUpdateStats] = useState<{ total: number; successful: number; errors: number } | null>(null);

  const triggerUpdate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await liveTrackingService.triggerAutoUpdate();
      
      setLastUpdate(new Date());
      
      if (result.success) {
        setUpdateStats({
          total: result.total || 0,
          successful: result.successful || 0,
          errors: result.errors || 0
        });
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Auto-update failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    lastUpdate,
    updateStats,
    triggerUpdate
  };
}
