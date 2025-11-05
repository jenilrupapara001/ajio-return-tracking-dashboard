import React, { useEffect, useState, useMemo } from 'react';
import { BarChart3, DollarSign, Package, Clock } from 'lucide-react';

export const AnalyticsPanel: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } as Record<string, string>;
        const [analyticsRes, metricsRes] = await Promise.all([
          fetch(`/analytics`, { headers }),
          fetch(`/dashboard/metrics`, { headers })
        ]);
        const analytics = analyticsRes.ok ? await analyticsRes.json() : null;
        const metrics = metricsRes.ok ? await metricsRes.json() : null;
        setData({ ...(analytics || {}), orders: metrics?.orders, returns: metrics?.returns, partners: metrics?.partners });
      } catch (e) {
        console.error('Failed to fetch analytics:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const computed = useMemo(() => {
    if (!data) return { returnRate: 0, avgOrderValue: 0 };
    const orders = data.orders || {};
    const returnRate = orders.total ? Math.round(((orders.cancelled || 0) / orders.total) * 1000) / 10 : 0;
    return { returnRate, avgOrderValue: orders.avgOrderValue || 0 };
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Comprehensive insights from live database data</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Return Rate</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : `${computed.returnRate}%`}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Resolution Time</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : `${(data?.avgResolutionDays || 0).toFixed(1)} days`}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Customer Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900">—</p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cost per Return</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : `₹${(data?.costPerReturn || 0).toLocaleString()}`}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Return Trends */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Trends</h3>
          <div className="space-y-4">
            {loading && <div className="text-sm text-gray-500">Loading...</div>}
            {!loading && data?.orderTrends?.map((item: any, index: number) => {
              const label = `${monthLabels[(item._id?.month || 1) - 1]} ${(item._id?.year || '')}`;
              return (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{label}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{item.orderCount} orders</div>
                      <div className="text-xs text-gray-500">₹{(item.revenue || 0).toLocaleString()}</div>
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, ((item.orderCount || 0) / Math.max(1, (data.orderTrends?.[0]?.orderCount || 1))) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Return Reasons */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Return Reasons</h3>
          <div className="space-y-4">
            {loading && <div className="text-sm text-gray-500">Loading...</div>}
            {!loading && data?.cancellationReasons?.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item._id}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{item.count}</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (item.count / Math.max(1, data.cancellationReasons?.[0]?.count || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Partner Performance */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Partner Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Partner</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Avg Time</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Success Rate</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Cost per Return</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Performance</th>
              </tr>
            </thead>
            <tbody>
              {(!loading && data?.partnerPerformance ? data.partnerPerformance : []).map((partner: any, index: number) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">{partner.partner}</td>
                  <td className="py-3 px-4">—</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      (parseFloat(partner.successRate) >= 95) 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {partner.successRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4">—</td>
                  <td className="py-3 px-4">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (parseFloat(partner.successRate) >= 95) ? 'bg-green-500' : 'bg-yellow-500'
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
    </div>
  );
};