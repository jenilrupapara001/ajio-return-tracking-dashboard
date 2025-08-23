
import React, { useState, useMemo, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Sidebar } from './components/Layout/Sidebar';
import { MetricsCard } from './components/Dashboard/MetricsCard';
import { ReturnsTable } from './components/Dashboard/ReturnsTable';
import { UploadPanel } from './components/Panels/UploadPanel';
import { AnalyticsPanel } from './components/Panels/AnalyticsPanel';
import { DatabasePanel } from './components/Panels/DatabasePanel';
import { ReportsPanel } from './components/Panels/ReportsPanel';
import { PerformancePanel } from './components/Panels/PerformancePanel';
import { UsersPanel } from './components/Panels/UsersPanel';
import { SettingsPanel } from './components/Panels/SettingsPanel';
import { OrdersTable } from './components/Dashboard/OrdersTable';
import { BarChart3, Package, TrendingUp, Clock, DollarSign } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [activePanel, setActivePanel] = useState('dashboard');
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);

  useEffect(() => {
    if (activePanel === 'dashboard') {
      fetchDashboardMetrics();
    }
  }, [activePanel]);

  const fetchDashboardMetrics = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/metrics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const renderActivePanel = () => {
    switch (activePanel) {
      case 'upload':
        return <UploadPanel />;
      case 'analytics':
        return <AnalyticsPanel />;
      case 'database':
        return <DatabasePanel />;
      case 'orders':
        return <OrdersTable />;
      case 'returns':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Returns Management</h1>
              <p className="text-gray-600 mt-2">Track and manage all return requests</p>
            </div>
            <ReturnsTable />
          </div>
        );
      case 'reports':
        return (
          <div className="space-y-6">
            <ReportsPanel />
          </div>
        );
      case 'performance':
        return (
          <div className="space-y-6">
            <PerformancePanel />
          </div>
        );
      case 'users':
        return (
          <div className="space-y-6">
            <UsersPanel />
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <SettingsPanel />
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
              <p className="text-gray-600 mt-2">Real-time insights from SQL Server database</p>
            </div>
            
            {/* Metrics Cards */}
            {dashboardMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricsCard
                  title="Total Returns"
                  value={dashboardMetrics.orders.total}
                  change={5.2}
                  changeType="positive"
                  icon={<Package className="h-6 w-6" />}
                  color="blue"
                />
                <MetricsCard
                  title="Delivered Orders"
                  value={dashboardMetrics.orders.delivered}
                  change={8.1}
                  changeType="positive"
                  icon={<Package className="h-6 w-6" />}
                  color="green"
                />
                <MetricsCard
                  title="Cancelled Orders"
                  value={dashboardMetrics.orders.cancelled}
                  change={2.3}
                  changeType="positive"
                  icon={<Package className="h-6 w-6" />}
                  color="orange"
                />
                <MetricsCard
                  title="Total Revenue"
                  value={formatCurrency(dashboardMetrics.orders.totalRevenue)}
                  change={12.5}
                  changeType="positive"
                  icon={<DollarSign className="h-6 w-6" />}
                  color="purple"
                />
              </div>
            )}

            {/* Additional Metrics */}
            {dashboardMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricsCard
                  title="Pre-Invoice Cancellations"
                  value={dashboardMetrics.orders.preInvoiceCancellations}
                  change={1.2}
                  changeType="negative"
                  icon={<Clock className="h-6 w-6" />}
                  color="orange"
                />
                <MetricsCard
                  title="Post-Invoice Cancellations"
                  value={dashboardMetrics.orders.postInvoiceCancellations}
                  change={0.8}
                  changeType="positive"
                  icon={<Clock className="h-6 w-6" />}
                  color="red"
                />
                <MetricsCard
                  title="Average Order Value"
                  value={formatCurrency(dashboardMetrics.orders.avgOrderValue)}
                  change={3.4}
                  changeType="positive"
                  icon={<DollarSign className="h-6 w-6" />}
                  color="blue"
                />
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-900">SQL Server Database</span>
                      </div>
                      <span className="text-sm text-green-700">Connected</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-blue-900">File Processing</span>
                      </div>
                      <span className="text-sm text-blue-700">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="font-medium text-purple-900">Real-time Updates</span>
                      </div>
                      <span className="text-sm text-purple-700">Enabled</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                {dashboardMetrics && dashboardMetrics.partners && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Partners</h2>
                    <div className="space-y-3">
                      {dashboardMetrics.partners.map((partner: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{partner.name}</p>
                            <p className="text-sm text-gray-600">{partner.totalOrders} orders</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">{partner.successRate}%</p>
                            <p className="text-xs text-gray-500">Success Rate</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activePanel={activePanel} onPanelChange={setActivePanel} />
      
      <main className="flex-1 p-8">
        {renderActivePanel()}
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;