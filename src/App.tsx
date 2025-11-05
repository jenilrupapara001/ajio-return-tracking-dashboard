import React, { useState, useMemo, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginForm from './components/Auth/LoginForm';

import { Sidebar } from './components/Layout/Sidebar';
import RealTimeCharts from './components/Dashboard/RealTimeCharts';
import { ReturnsTable } from './components/Dashboard/ReturnsTable';
import { UploadPanel } from './components/Panels/UploadPanel';
import { AnalyticsPanel } from './components/Panels/AnalyticsPanel';
import { DatabasePanel } from './components/Panels/DatabasePanel';
import { ReportsPanel } from './components/Panels/ReportsPanel';
import { PerformancePanel } from './components/Panels/PerformancePanel';

import RolesPanel from './components/Panels/RolesPanel';
import { SettingsPanel } from './components/Panels/SettingsPanel';
import { OrdersTable } from './components/Dashboard/OrdersTable';
import SellersPanel from './components/Panels/SellersPanel';
import RealTimeTracking from './components/Dashboard/RealTimeTracking';

const Dashboard: React.FC = () => {
  const validPanels = useMemo(() => new Set(['dashboard','upload','analytics','database','orders','returns','reports','performance','roles','settings']), []);
  const initialPanel = useMemo(() => {
    const fromHash = (window.location.hash || '').replace('#','');
    if (fromHash && validPanels.has(fromHash)) return fromHash;
    const saved = localStorage.getItem('active_panel');
    if (saved && validPanels.has(saved)) return saved;
    return 'dashboard';
  }, [validPanels]);
  const [activePanel, setActivePanel] = useState(initialPanel);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (activePanel === 'dashboard') {
      fetchDashboardMetrics();
    }
    // Persist panel in URL hash and localStorage
    if (activePanel) {
      try {
        window.history.replaceState(null, '', `#${activePanel}`);
        localStorage.setItem('active_panel', activePanel);
      } catch {}
    }
  }, [activePanel]);

  useEffect(() => {
    const onHashChange = () => {
      const fromHash = (window.location.hash || '').replace('#','');
      if (fromHash && validPanels.has(fromHash)) {
        setActivePanel(fromHash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [validPanels]);

  const fetchDashboardMetrics = async () => {
    try {
      const response = await fetch('/dashboard/metrics', {
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

  const renderActivePanel = () => {
    switch (activePanel) {
      case 'upload':
        return <UploadPanel />;
      case 'analytics':
        return <AnalyticsPanel />;
      case 'database':
        return <DatabasePanel />;
      case 'orders':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
              <p className="text-gray-600 mt-2">Track and manage orders with live statuses</p>
            </div>
            <OrdersTable />
          </div>
        );
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
        return <ReportsPanel />;
      case 'performance':
        return <PerformancePanel />;

      case 'sellers':
        return <SellersPanel />;
      case 'roles':
        return <RolesPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Real-time insights from SQL Server database</p>
            </div>
            
            {dashboardMetrics && (
              <RealTimeCharts autoRefresh={true} refreshInterval={15000} />
            )}

            {/* Real-time Tracking Section */}
            {dashboardMetrics?.tracking && (
              <div className="mt-8">
                <RealTimeTracking 
                  awbNumbers={[]} // This would be populated with actual AWB numbers
                  onStatusUpdate={(data) => {
                    console.log('Tracking status updated:', data);
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Status</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-900 dark:text-green-100">SQL Server Database</span>
                      </div>
                      <span className="text-sm text-green-700 dark:text-green-300">Connected</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-blue-900 dark:text-blue-100">File Processing</span>
                      </div>
                      <span className="text-sm text-blue-700 dark:text-blue-300">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="font-medium text-purple-900 dark:text-purple-100">Real-time Updates</span>
                      </div>
                      <span className="text-sm text-purple-700 dark:text-purple-300">Enabled</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                {dashboardMetrics && dashboardMetrics.partners && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Shipping Partners</h2>
                    <div className="space-y-3">
                      {dashboardMetrics.partners.map((partner: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-600 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{partner.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{partner.totalOrders} orders</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">{partner.successRate}%</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar activePanel={activePanel} onPanelChange={setActivePanel} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto h-screen">{renderActivePanel()}</main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isLoading, isLoggingOut } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center animate-fadeIn">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full mx-auto mb-4"></div>
            <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            <div className="w-12 h-12 bg-blue-600 dark:bg-blue-400 rounded-full mx-auto mb-4 absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading Dashboard...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center animate-fadeOut">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-800 rounded-full mx-auto mb-4"></div>
            <div className="w-16 h-16 border-4 border-gray-600 dark:border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Signing out...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="animate-fadeIn">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <Dashboard />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
