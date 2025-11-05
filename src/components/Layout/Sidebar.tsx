import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Upload, 
  BarChart3, 
  Settings, 
  Users, 
  FileText,
  TrendingUp,
  Database,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../ThemeToggle';

interface SidebarProps {
  activePanel: string;
  onPanelChange: (panel: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePanel, onPanelChange, collapsed = false, onToggle }) => {
  const { user, logout, isLoggingOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders Management', icon: Package },
    { id: 'returns', label: 'Returns Management', icon: Package },
    { id: 'upload', label: 'Upload Reports', icon: Upload },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'database', label: 'Data Management', icon: Database },
    { id: 'sellers', label: 'Sellers', icon: Users },

    { id: 'roles', label: 'Role & User Management', icon: Users, adminOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.adminOnly || user?.role?.name === 'admin'
  );

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0 flex flex-col overflow-y-auto transition-all`}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Ajio Portal</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Returns Management</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            title={collapsed ? 'Expand' : 'Collapse'}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Floating expand button when collapsed (ensures visibility) */}
      {collapsed && (
        <button
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="absolute -right-3 top-4 z-20 p-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow"
        >
          <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-200" />
        </button>
      )}

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {user?.name.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.name || 'User'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPanelChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Theme Toggle and Logout */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 space-y-3">
        {/* Theme Toggle */}
        <div className="flex justify-center">{!collapsed && <ThemeToggle />}</div>
        
        {/* Logout */}
        <button
          onClick={logout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
        >
          {isLoggingOut ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin"></div>
              {!collapsed && <span className="text-sm font-medium">Signing out...</span>}
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="text-sm font-medium">Logout</span>}
            </>
          )}
        </button>
      </div>
    </div>
  );
};