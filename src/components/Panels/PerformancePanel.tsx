import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, Clock, Package, DollarSign, Users, AlertTriangle } from 'lucide-react';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  change: number;
  changeType: 'positive' | 'negative';
  unit: string;
  category: 'orders' | 'returns' | 'financial' | 'shipping';
}

interface ShippingPartnerMetrics {
  partner: string;
  deliveryTime: number;
  successRate: number;
  cost: number;
  volume: number;
  trend: 'up' | 'down' | 'stable';
}

export const PerformancePanel: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [shippingMetrics, setShippingMetrics] = useState<ShippingPartnerMetrics[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30_days');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedPeriod]);

  const fetchPerformanceData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } as Record<string, string>;
      const [metricsRes, analyticsRes] = await Promise.all([
        fetch(`/dashboard/metrics`, { headers }),
        fetch(`/analytics`, { headers })
      ]);

      const metricsJson = metricsRes.ok ? await metricsRes.json() : null;
      const analyticsJson = analyticsRes.ok ? await analyticsRes.json() : null;

      const orders = metricsJson?.orders || {};
      const returns = metricsJson?.returns || {};

      const computed: PerformanceMetric[] = [
        {
          id: 'order-fulfillment',
          name: 'Order Fulfillment Rate',
          value: orders.total ? Math.round(((orders.delivered || 0) / orders.total) * 1000) / 10 : 0,
          target: 95,
          change: 0,
          changeType: 'positive',
          unit: '%',
          category: 'orders'
        },
        {
          id: 'return-rate',
          name: 'Return Rate',
          value: orders.total ? Math.round(((returns.total || 0) / orders.total) * 1000) / 10 : 0,
          target: 7,
          change: 0,
          changeType: 'negative',
          unit: '%',
          category: 'returns'
        },
        {
          id: 'revenue-per-order',
          name: 'Revenue per Order',
          value: orders.avgOrderValue || 0,
          target: (orders.avgOrderValue || 0) * 1.1 || 2000,
          change: 0,
          changeType: 'positive',
          unit: '₹',
          category: 'financial'
        },
        {
          id: 'pending-returns',
          name: 'Pending Returns',
          value: returns.pending || 0,
          target: Math.max(0, (returns.total || 0) * 0.1),
          change: 0,
          changeType: 'positive',
          unit: '',
          category: 'returns'
        }
      ];

      setMetrics(computed);

      const partnerPerf = analyticsJson?.partnerPerformance || [];
      const mappedPartners: ShippingPartnerMetrics[] = partnerPerf.map((p: any) => ({
        partner: p.partner,
        deliveryTime: 0,
        successRate: parseFloat(p.successRate || '0'),
        cost: 0,
        volume: p.totalOrders || 0,
        trend: (parseFloat(p.successRate || '0') >= 95 ? 'up' : parseFloat(p.successRate || '0') >= 90 ? 'stable' : 'down')
      }));
      setShippingMetrics(mappedPartners);
    } catch (e) {
      // If any call fails, keep arrays empty; UI will still render
      setMetrics([]);
      setShippingMetrics([]);
    }
  };

  const filteredMetrics = metrics.filter(metric => 
    selectedCategory === 'all' || metric.category === selectedCategory
  );

  const getMetricIcon = (category: string) => {
    switch (category) {
      case 'orders':
        return <Package className="h-5 w-5" />;
      case 'returns':
        return <TrendingUp className="h-5 w-5" />;
      case 'financial':
        return <DollarSign className="h-5 w-5" />;
      case 'shipping':
        return <Clock className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getMetricColor = (metric: PerformanceMetric) => {
    const isOnTarget = metric.value >= metric.target;
    return isOnTarget ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor key performance indicators and business metrics</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7_days">Last 7 Days</option>
              <option value="30_days">Last 30 Days</option>
              <option value="90_days">Last 90 Days</option>
              <option value="current_month">Current Month</option>
              <option value="last_month">Last Month</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="orders">Orders</option>
              <option value="returns">Returns</option>
              <option value="financial">Financial</option>
              <option value="shipping">Shipping</option>
            </select>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Target className="h-4 w-4" />
            Set Targets
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMetrics.map((metric) => (
          <div key={metric.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  {getMetricIcon(metric.category)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{metric.name}</h3>
                  <span className="text-xs text-gray-500 capitalize">{metric.category}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {metric.unit === '₹' ? `₹${metric.value.toLocaleString()}` : `${metric.value}${metric.unit}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    Target: {metric.unit === '₹' ? `₹${metric.target.toLocaleString()}` : `${metric.target}${metric.unit}`}
                  </div>
                </div>
                <div className={`text-right ${getMetricColor(metric)}`}>
                  <div className="flex items-center gap-1">
                    {metric.changeType === 'positive' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {Math.abs(metric.change)}{metric.unit === '₹' ? '' : metric.unit}
                    </span>
                  </div>
                  <div className="text-xs">vs last period</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    metric.value >= metric.target ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shipping Partner Performance */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Shipping Partner Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Partner</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Delivery Time</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Success Rate</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Cost per Order</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Volume</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Trend</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Performance</th>
              </tr>
            </thead>
            <tbody>
              {shippingMetrics.map((partner, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium">{partner.partner}</td>
                  <td className="py-4 px-4">{partner.deliveryTime} days</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      partner.successRate >= 95 
                        ? 'bg-green-100 text-green-800' 
                        : partner.successRate >= 90
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {partner.successRate}%
                    </span>
                  </td>
                  <td className="py-4 px-4">₹{partner.cost}</td>
                  <td className="py-4 px-4">{partner.volume.toLocaleString()}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      {getTrendIcon(partner.trend)}
                      <span className="text-sm capitalize">{partner.trend}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          partner.successRate >= 95 ? 'bg-green-500' : 
                          partner.successRate >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${partner.successRate}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Alerts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Alerts</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <div className="font-medium text-red-900">Return Rate Above Target</div>
              <div className="text-sm text-red-700">Current return rate (8.2%) exceeds target (7.0%)</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <div className="font-medium text-yellow-900">Processing Time Increasing</div>
              <div className="text-sm text-yellow-700">Average processing time has increased by 0.3 days</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <div className="font-medium text-blue-900">Customer Satisfaction Improving</div>
              <div className="text-sm text-blue-700">Rating increased by 0.1 points this month</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};