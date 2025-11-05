import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Brush,
  ReferenceLine,
  Label
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Activity, Download, DollarSign, AlertCircle } from 'lucide-react';

interface RealTimeChartsProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface ChartData {
  orders: {
    total: number;
    delivered: number;
    cancelled: number;
    shipped?: number;
    inTransit?: number;
    pending?: number;
    exception?: number;
    totalRevenue?: number;
    avgOrderValue?: number;
  };
  returns: {
    total: number;
    completed: number;
    pending?: number;
    inProgress?: number;
    initiated?: number;
    rejected?: number;
  };
  partners: Array<{
    name: string;
    totalOrders: number;
    deliveredOrders: number;
    successRate: number | string;
  }>;
}

interface TrendDataPoint {
  date: string;
  fullDate: string;
  orders: number;
  returns: number;
  revenue: number;
  delivered: number;
  cancelled: number;
  completed: number;
}

interface StatusDataItem {
  name: string;
  value: number;
  color: string;
}

const COLORS = {
  delivered: '#22c55e',
  inTransit: '#3b82f6',
  cancelled: '#ef4444',
  pending: '#f59e0b',
  exception: '#8b5cf6',
  completed: '#10b981',
  inProgress: '#06b6d4',
  rejected: '#f43f5e'
} as const;

const GRADIENT_COLORS = [
  { start: '#3b82f6', end: '#2563eb' },
  { start: '#22c55e', end: '#16a34a' },
  { start: '#f59e0b', end: '#d97706' },
  { start: '#8b5cf6', end: '#7c3aed' },
  { start: '#ef4444', end: '#dc2626' },
  { start: '#06b6d4', end: '#0891b2' }
] as const;

const REFRESH_INTERVAL = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div 
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3"
      role="tooltip"
      aria-label={`Chart data for ${label}`}
    >
      <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={`tooltip-${index}`} className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {entry.name}: <span className="font-semibold text-gray-900 dark:text-white">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
};

export const RealTimeCharts: React.FC<RealTimeChartsProps> = ({
  autoRefresh = true,
  refreshInterval = REFRESH_INTERVAL
}) => {
  const [data, setData] = useState<ChartData | null>(null);
  const [trendsData, setTrendsData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'orders' | 'returns' | 'revenue'>('orders');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const fetchData = useCallback(async (retryAttempt = 0): Promise<void> => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setIsRefreshing(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const [metricsResponse, trendsResponse] = await Promise.all([
        fetch('/dashboard/metrics', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal
        }),
        fetch(`/dashboard/trends?range=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal
        })
      ]);

      if (signal.aborted) return;

      if (!metricsResponse.ok) {
        throw new Error(`Failed to fetch metrics: ${metricsResponse.statusText}`);
      }

      const metrics: ChartData = await metricsResponse.json();
      setData(metrics);
      setLastUpdate(new Date());
      retryCountRef.current = 0;

      if (trendsResponse.ok) {
        const trends: TrendDataPoint[] = await trendsResponse.json();
        setTrendsData(Array.isArray(trends) ? trends : []);
      } else {
        setTrendsData([]);
      }
    } catch (err: unknown) {
      if (signal.aborted) return;

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      
      // Retry logic for network errors
      if (retryAttempt < MAX_RETRIES && !(err instanceof DOMException && err.name === 'AbortError')) {
        retryCountRef.current = retryAttempt + 1;
        setTimeout(() => {
          fetchData(retryAttempt + 1);
        }, RETRY_DELAY * (retryAttempt + 1));
        return;
      }

      setError(errorMessage);
      console.error('Error fetching chart data:', err);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  // Memoized chart data
  const orderStatusData = useMemo<StatusDataItem[]>(() => {
    if (!data?.orders) return [];
    return [
      { name: 'Delivered', value: Number(data.orders.delivered || 0), color: COLORS.delivered },
      { name: 'In Transit', value: Number(data.orders.inTransit || data.orders.shipped || 0), color: COLORS.inTransit },
      { name: 'Pending', value: Number(data.orders.pending || 0), color: COLORS.pending },
      { name: 'Cancelled', value: Number(data.orders.cancelled || 0), color: COLORS.cancelled },
      { name: 'Exception', value: Number(data.orders.exception || 0), color: COLORS.exception }
    ].filter(item => item.value > 0);
  }, [data]);

  const returnStatusData = useMemo<StatusDataItem[]>(() => {
    if (!data?.returns) return [];
    return [
      { name: 'Completed', value: Number(data.returns.completed || 0), color: COLORS.completed },
      { name: 'In Progress', value: Number(data.returns.inProgress || 0), color: COLORS.inProgress },
      { name: 'Initiated', value: Number(data.returns.initiated || 0), color: COLORS.pending },
      { name: 'Rejected', value: Number(data.returns.rejected || 0), color: COLORS.rejected }
    ].filter(item => item.value > 0);
  }, [data]);

  const partnerPerformanceData = useMemo(() => {
    if (!data?.partners || !Array.isArray(data.partners)) return [];
    return data.partners.map((p, index) => ({
      name: p.name || `Partner ${index + 1}`,
      successRate: Number(p.successRate || 0),
      totalOrders: Number(p.totalOrders || 0),
      deliveredOrders: Number(p.deliveredOrders || 0),
      fill: GRADIENT_COLORS[index % GRADIENT_COLORS.length].start
    }));
  }, [data]);

  const totalOrders = useMemo(() => 
    orderStatusData.reduce((sum, item) => sum + item.value, 0),
    [orderStatusData]
  );

  const totalReturns = useMemo(() => 
    returnStatusData.reduce((sum, item) => sum + item.value, 0),
    [returnStatusData]
  );

  const fulfillmentRate = useMemo(() => 
    totalOrders ? Math.round((Number(data?.orders?.delivered || 0) / totalOrders) * 100) : 0,
    [totalOrders, data]
  );

  const handleExport = useCallback(() => {
    if (!data) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Orders', totalOrders],
      ['Total Returns', totalReturns],
      ['Fulfillment Rate', `${fulfillmentRate}%`],
      ...orderStatusData.map(item => [item.name, item.value]),
      ...returnStatusData.map(item => [item.name, item.value])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-charts-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [data, totalOrders, totalReturns, fulfillmentRate, orderStatusData, returnStatusData]);

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96" role="status" aria-label="Loading dashboard data">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading real-time data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-96" role="alert">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load Data</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            aria-label="Retry loading data"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || (totalOrders === 0 && totalReturns === 0)) {
    return (
      <div className="flex items-center justify-center h-96" role="status">
        <div className="text-center max-w-md">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Upload order and return files to see analytics charts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" role="region" aria-label="Real-time analytics dashboard">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Real-Time Analytics</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
            {autoRefresh && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <Activity className="h-3 w-3 animate-pulse" aria-hidden="true" />
                Auto-refresh enabled
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            aria-label="Select time range"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={() => fetchData()}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isRefreshing ? 'Refreshing data' : 'Refresh data'}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Export chart data to CSV"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && data && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 flex items-center gap-3" role="alert">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Warning: {error}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Showing cached data. Click refresh to retry.
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform" role="article" aria-label="Total orders metric">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm font-medium">Total Orders</span>
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold">{totalOrders.toLocaleString()}</div>
          <div className="text-blue-100 text-sm mt-1">
            {data.orders.delivered || 0} delivered
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform" role="article" aria-label="Returns metric">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100 text-sm font-medium">Returns</span>
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold">{totalReturns.toLocaleString()}</div>
          <div className="text-green-100 text-sm mt-1">
            {data.returns.completed || 0} completed
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform" role="article" aria-label="Fulfillment rate metric">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-100 text-sm font-medium">Fulfillment Rate</span>
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold">{fulfillmentRate}%</div>
          <div className="text-purple-100 text-sm mt-1">
            {data.partners?.length || 0} active partners
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform" role="article" aria-label="Revenue metric">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orange-100 text-sm font-medium">Revenue</span>
            <DollarSign className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold">
            ₹{((data.orders.totalRevenue || 0) / 100000).toFixed(1)}L
          </div>
          <div className="text-orange-100 text-sm mt-1">
            Avg: ₹{Math.round(data.orders.avgOrderValue || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Distribution */}
        {orderStatusData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Orders Distribution</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">{totalOrders} total</div>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <defs>
                    {orderStatusData.map((entry, index) => (
                      <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={orderStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={40}
                    label={(props: any) => {
                      const name = props.name || '';
                      const percent = props.percent || 0;
                      return `${name}: ${(percent * 100).toFixed(1)}%`;
                    }}
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#gradient-${index})`}
                        stroke={entry.color}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Returns Status */}
        {returnStatusData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Returns Status</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">{totalReturns} total</div>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <defs>
                    {returnStatusData.map((entry, index) => (
                      <linearGradient key={`return-gradient-${index}`} id={`return-gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={returnStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={40}
                    label={(props: any) => {
                      const name = props.name || '';
                      const percent = props.percent || 0;
                      return `${name}: ${(percent * 100).toFixed(1)}%`;
                    }}
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {returnStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#return-gradient-${index})`}
                        stroke={entry.color}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Fulfillment Rate */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fulfillment Performance</h3>
          <div className="flex items-center gap-2">
            {fulfillmentRate >= 80 && <TrendingUp className="h-5 w-5 text-green-500" aria-label="High fulfillment rate" />}
            {fulfillmentRate < 80 && fulfillmentRate >= 60 && <Activity className="h-5 w-5 text-yellow-500" aria-label="Medium fulfillment rate" />}
            {fulfillmentRate < 60 && <TrendingDown className="h-5 w-5 text-red-500" aria-label="Low fulfillment rate" />}
          </div>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <RadialBarChart
              innerRadius="60%"
              outerRadius="90%"
              data={[{ name: 'Fulfillment', value: Math.max(0.1, fulfillmentRate) }]}
              startAngle={90}
              endAngle={Math.min(450, 90 + (fulfillmentRate / 100) * 360)}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                background={{ fill: '#e5e7eb', fillOpacity: 0.3 }}
                dataKey="value"
                cornerRadius={10}
                fill="url(#fulfillmentGradient)"
                animationBegin={0}
                animationDuration={1200}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-4xl font-bold fill-current"
                          fill="currentColor"
                        >
                          {fulfillmentRate}%
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </RadialBar>
              <defs>
                <linearGradient id="fulfillmentGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <Tooltip formatter={(v: number) => [`${v}%`, 'Fulfillment Rate']} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Partner Performance */}
      {partnerPerformanceData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Partner Performance</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate & Total Orders</div>
          </div>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <ComposedChart data={partnerPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  {partnerPerformanceData.map((entry, index) => (
                    <linearGradient key={`bar-gradient-${index}`} id={`bar-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                      <stop offset="100%" stopColor={entry.fill} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#6b7280' }}
                  style={{ fontSize: '12px' }}
                />
                <YAxis yAxisId="left" label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Total Orders', angle: 90, position: 'insideRight' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  yAxisId="right"
                  dataKey="totalOrders"
                  fill="url(#bar-gradient-0)"
                  name="Total Orders"
                  radius={[8, 8, 0, 0]}
                  animationBegin={0}
                  animationDuration={800}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="successRate"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Success Rate (%)"
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 8 }}
                  animationBegin={0}
                  animationDuration={800}
                />
                <ReferenceLine yAxisId="left" y={80} stroke="#22c55e" strokeDasharray="5 5" label="Target 80%" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Time Trends */}
      {trendsData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Trends Over Time</h3>
            <div className="flex items-center gap-2" role="tablist">
              <button
                onClick={() => setSelectedMetric('orders')}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedMetric === 'orders'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                role="tab"
                aria-selected={selectedMetric === 'orders'}
                aria-label="Show orders trend"
              >
                Orders
              </button>
              <button
                onClick={() => setSelectedMetric('returns')}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedMetric === 'returns'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                role="tab"
                aria-selected={selectedMetric === 'returns'}
                aria-label="Show returns trend"
              >
                Returns
              </button>
              <button
                onClick={() => setSelectedMetric('revenue')}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedMetric === 'revenue'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                role="tab"
                aria-selected={selectedMetric === 'revenue'}
                aria-label="Show revenue trend"
              >
                Revenue
              </button>
            </div>
          </div>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <AreaChart data={trendsData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <defs>
                  <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="returnsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fill: '#6b7280' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedMetric === 'orders' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#ordersGradient)"
                      name="Orders"
                      animationBegin={0}
                      animationDuration={1000}
                    />
                    <Area
                      type="monotone"
                      dataKey="delivered"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                      name="Delivered"
                      animationBegin={200}
                      animationDuration={1000}
                    />
                  </>
                )}
                {selectedMetric === 'returns' && (
                  <Area
                    type="monotone"
                    dataKey="returns"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#returnsGradient)"
                    name="Returns"
                    animationBegin={0}
                    animationDuration={1000}
                  />
                )}
                {selectedMetric === 'revenue' && (
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    name="Revenue (₹)"
                    animationBegin={0}
                    animationDuration={1000}
                  />
                )}
                <Brush dataKey="date" height={30} stroke="#3b82f6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeCharts;
