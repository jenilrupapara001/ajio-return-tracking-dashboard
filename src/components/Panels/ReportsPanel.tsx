import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Filter, TrendingUp, Package, DollarSign, AlertCircle } from 'lucide-react';

interface Report {
  id: string;
  name: string;
  type: 'order' | 'return' | 'financial' | 'performance';
  description: string;
  lastGenerated: string;
  status: 'ready' | 'generating' | 'error';
  downloadUrl?: string;
}

export const ReportsPanel: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState('last_30_days');
  const [selectedReportType, setSelectedReportType] = useState('all');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    // Mock data - replace with actual API call
    const mockReports: Report[] = [
      {
        id: '1',
        name: 'Dropship Order Summary',
        type: 'order',
        description: 'Complete summary of all dropship orders with status breakdown',
        lastGenerated: '2025-01-15T10:30:00Z',
        status: 'ready',
        downloadUrl: '/api/reports/download/1'
      },
      {
        id: '2',
        name: 'RTV Analysis Report',
        type: 'return',
        description: 'Detailed analysis of return-to-vendor cases with reasons',
        lastGenerated: '2025-01-15T09:15:00Z',
        status: 'ready',
        downloadUrl: '/api/reports/download/2'
      },
      {
        id: '3',
        name: 'Financial Reconciliation',
        type: 'financial',
        description: 'Revenue, refunds, and commission reconciliation report',
        lastGenerated: '2025-01-14T18:45:00Z',
        status: 'ready',
        downloadUrl: '/api/reports/download/3'
      },
      {
        id: '4',
        name: 'Shipping Partner Performance',
        type: 'performance',
        description: 'Performance metrics for all shipping partners',
        lastGenerated: '2025-01-15T08:20:00Z',
        status: 'ready',
        downloadUrl: '/api/reports/download/4'
      },
      {
        id: '5',
        name: 'Cancellation Analysis',
        type: 'order',
        description: 'Pre and post invoice cancellation analysis',
        lastGenerated: '2025-01-15T07:30:00Z',
        status: 'generating'
      },
      {
        id: '6',
        name: 'Customer Insights',
        type: 'performance',
        description: 'Customer behavior and order patterns analysis',
        lastGenerated: '2025-01-14T16:20:00Z',
        status: 'error'
      }
    ];
    setReports(mockReports);
  };

  const generateReport = async (reportId: string) => {
    setIsGenerating(reportId);
    
    // Simulate report generation
    setTimeout(() => {
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: 'ready', lastGenerated: new Date().toISOString(), downloadUrl: `/api/reports/download/${reportId}` }
          : report
      ));
      setIsGenerating(null);
    }, 3000);
  };

  const downloadReport = (report: Report) => {
    if (report.downloadUrl) {
      // Simulate download
      console.log(`Downloading report: ${report.name}`);
      const link = document.createElement('a');
      link.href = report.downloadUrl;
      link.download = `${report.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredReports = reports.filter(report => 
    selectedReportType === 'all' || report.type === selectedReportType
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <Download className="h-4 w-4 text-green-500" />;
      case 'generating':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'return':
        return <TrendingUp className="h-5 w-5 text-orange-500" />;
      case 'financial':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'performance':
        return <TrendingUp className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports Center</h1>
        <p className="text-gray-600 mt-2">Generate and download comprehensive business reports</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_90_days">Last 90 Days</option>
                <option value="current_month">Current Month</option>
                <option value="last_month">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Reports</option>
                <option value="order">Order Reports</option>
                <option value="return">Return Reports</option>
                <option value="financial">Financial Reports</option>
                <option value="performance">Performance Reports</option>
              </select>
            </div>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <FileText className="h-4 w-4" />
            Schedule Report
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <div key={report.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getTypeIcon(report.type)}
                <div>
                  <h3 className="font-semibold text-gray-900">{report.name}</h3>
                  <span className="text-xs text-gray-500 capitalize">{report.type} Report</span>
                </div>
              </div>
              {getStatusIcon(report.status)}
            </div>

            <p className="text-sm text-gray-600 mb-4">{report.description}</p>

            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <span>Last Generated:</span>
              <span>{new Date(report.lastGenerated).toLocaleDateString()}</span>
            </div>

            <div className="flex gap-2">
              {report.status === 'ready' && (
                <button
                  onClick={() => downloadReport(report)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              )}
              
              <button
                onClick={() => generateReport(report.id)}
                disabled={isGenerating === report.id || report.status === 'generating'}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating === report.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Reports */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Package className="h-6 w-6 text-blue-500 mb-2" />
            <div className="font-medium">Today's Orders</div>
            <div className="text-sm text-gray-500">Current day summary</div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <TrendingUp className="h-6 w-6 text-orange-500 mb-2" />
            <div className="font-medium">Pending Returns</div>
            <div className="text-sm text-gray-500">Active RTV cases</div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <DollarSign className="h-6 w-6 text-green-500 mb-2" />
            <div className="font-medium">Revenue Summary</div>
            <div className="text-sm text-gray-500">Financial overview</div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
            <div className="font-medium">Issues Report</div>
            <div className="text-sm text-gray-500">Problems & alerts</div>
          </button>
        </div>
      </div>
    </div>
  );
};