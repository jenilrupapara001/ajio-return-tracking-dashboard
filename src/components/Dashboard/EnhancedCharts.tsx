import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter,
  Treemap
} from 'recharts';

interface EnhancedChartsProps {
  metrics: any;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];

export const EnhancedCharts: React.FC<EnhancedChartsProps> = ({ metrics }) => {
  const orders = metrics?.orders || {};
  const returns = metrics?.returns || {};
  const partners = Array.isArray(metrics?.partners) ? metrics.partners : [];

  // Order status distribution
  const orderStatusData = [
    { name: 'Delivered', value: Number(orders.delivered || 0), color: '#22c55e' },
    { name: 'In Transit', value: Number(orders.inTransit || 0), color: '#3b82f6' },
    { name: 'Cancelled', value: Number(orders.cancelled || 0), color: '#ef4444' },
    { name: 'Pending', value: Number(orders.pending || 0), color: '#f59e0b' },
    { name: 'Exception', value: Number(orders.exception || 0), color: '#8b5cf6' }
  ];

  // Return status distribution
  const returnStatusData = [
    { name: 'Completed', value: Number(returns.completed || 0), color: '#22c55e' },
    { name: 'In Progress', value: Number(returns.inProgress || 0), color: '#3b82f6' },
    { name: 'Initiated', value: Number(returns.initiated || 0), color: '#f59e0b' },
    { name: 'Rejected', value: Number(returns.rejected || 0), color: '#ef4444' }
  ];

  // Partner performance data
  const partnerPerformanceData = partners.map((p: any, index: number) => ({
    name: p.name || `Partner ${index + 1}`,
    successRate: Number(p.successRate || 0),
    totalOrders: Number(p.totalOrders || 0),
    avgDeliveryTime: Number(p.avgDeliveryTime || 0),
    fill: COLORS[index % COLORS.length]
  }));

  // Monthly trends data (mock data for now)
  const monthlyTrendsData = [
    { month: 'Jan', orders: 1200, returns: 80, revenue: 150000 },
    { month: 'Feb', orders: 1350, returns: 95, revenue: 165000 },
    { month: 'Mar', orders: 1100, returns: 70, revenue: 140000 },
    { month: 'Apr', orders: 1600, returns: 110, revenue: 180000 },
    { month: 'May', orders: 1450, returns: 85, revenue: 170000 },
    { month: 'Jun', orders: 1800, returns: 120, revenue: 200000 }
  ];

  // Delivery time distribution
  const deliveryTimeData = [
    { range: '0-1 days', count: 450, percentage: 25 },
    { range: '1-2 days', count: 720, percentage: 40 },
    { range: '2-3 days', count: 360, percentage: 20 },
    { range: '3-5 days', count: 180, percentage: 10 },
    { range: '5+ days', count: 90, percentage: 5 }
  ];

  // Revenue by status
  const revenueByStatusData = [
    { status: 'Delivered', revenue: Number(orders.deliveredRevenue || 0), count: Number(orders.delivered || 0) },
    { status: 'In Transit', revenue: Number(orders.inTransitRevenue || 0), count: Number(orders.inTransit || 0) },
    { status: 'Cancelled', revenue: Number(orders.cancelledRevenue || 0), count: Number(orders.cancelled || 0) }
  ];

  const totalOrders = orderStatusData.reduce((sum, item) => sum + item.value, 0);
  const totalReturns = returnStatusData.reduce((sum, item) => sum + item.value, 0);
  const fulfillmentRate = totalOrders ? Math.round((Number(orders.delivered || 0) / totalOrders) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Top Row - Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Orders Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Orders Distribution</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Returns Status Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Returns Status</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={returnStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {returnStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fulfillment Rate Radial Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fulfillment Rate</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <RadialBarChart
                innerRadius="60%"
                outerRadius="90%"
                data={[{ name: 'Fulfillment', value: Math.max(0.1, fulfillmentRate) }]}
                startAngle={90}
                endAngle={Math.min(450, 90 + (fulfillmentRate / 100) * 360)}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={8} fill="#3b82f6" />
                <Tooltip formatter={(v: any) => [`${v}%`, 'Fulfillment']} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-current" fill="currentColor">
                  {fulfillmentRate}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalOrders.toLocaleString()}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Orders</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalReturns.toLocaleString()}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Returns</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{partners.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Partners</div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partner Performance Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Partner Performance</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={partnerPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="successRate" fill="#3b82f6" name="Success Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trends Line Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Trends</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={monthlyTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#3b82f6" name="Orders" />
                <Line yAxisId="right" type="monotone" dataKey="returns" stroke="#ef4444" name="Returns" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Third Row - Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delivery Time Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Time Distribution</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={deliveryTimeData} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="range" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Status</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={revenueByStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Partner Orders Scatter Plot */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Partner Orders vs Success Rate</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <ScatterChart data={partnerPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="totalOrders" name="Total Orders" />
                <YAxis dataKey="successRate" name="Success Rate (%)" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter dataKey="successRate" fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fourth Row - Comprehensive Overview */}
      <div className="grid grid-cols-1 gap-6">
        {/* Combined Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Comprehensive Performance Overview</h3>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <ComposedChart data={monthlyTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" name="Orders" />
                <Bar yAxisId="left" dataKey="returns" fill="#ef4444" name="Returns" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#22c55e" name="Revenue (₹)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCharts;
