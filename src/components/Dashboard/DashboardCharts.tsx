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
  PolarAngleAxis
} from 'recharts';

interface DashboardChartsProps {
  metrics: any;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ metrics }) => {
  const orders = metrics?.orders || {};
  const returns = metrics?.returns || {};
  const partners = Array.isArray(metrics?.partners) ? metrics.partners : [];

  const delivered = Number(orders.delivered || 0);
  const cancelled = Number(orders.cancelled || 0);
  const total = Number(orders.total || 0);
  const other = Math.max(0, total - delivered - cancelled);
  const fulfillmentRate = total ? Math.round((delivered / total) * 1000) / 10 : 0;

  const ordersPieData = [
    { name: 'Delivered', value: delivered },
    { name: 'Cancelled', value: cancelled },
    { name: 'Other', value: other }
  ];

  const returnsBarData = [
    { name: 'Returns', Completed: Number(returns.completed || 0), Pending: Number(returns.pending || 0) }
  ];

  const partnerBarData = partners.map((p: any) => ({ name: p.name || p.partner || 'Partner', Success: Number(p.successRate || 0) }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Orders Distribution</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={ordersPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {ordersPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Returns Status</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={returnsBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Completed" fill="#22c55e" />
              <Bar dataKey="Pending" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fulfillment Rate</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={[{ name: 'Fulfillment', value: Math.max(0.0001, fulfillmentRate) }]}
              startAngle={90}
              endAngle={Math.min(450, 90 + (fulfillmentRate / 100) * 360)}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={8} fill="#3b82f6" />
              <Tooltip formatter={(v: any) => [`${v}%`, 'Fulfillment']} />
              {/* Center label */}
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-current" fill="currentColor">
                {fulfillmentRate}%
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:col-span-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Partner Success Rates</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={partnerBarData} margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Success" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;


