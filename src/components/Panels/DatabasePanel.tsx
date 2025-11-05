import React, { useState, useEffect } from 'react';
import { Database, Search, Download, RefreshCw, Trash2 } from 'lucide-react';

interface DatabaseRecord {
  id: string;
  table_name: string;
  record_count: number;
  last_updated: string;
  size_mb: number;
  status: 'active' | 'archived';
}

export const DatabasePanel: React.FC = () => {
  const [records, setRecords] = useState<DatabaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  const fetchDatabaseInfo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/database/info`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (response.ok) {
        const backendData = await response.json();
        const mapped: DatabaseRecord[] = backendData.map((t: any, idx: number) => ({
          id: t.id || String(idx + 1),
          table_name: t.table_name || t.name || 'unknown',
          record_count: t.record_count ?? 0,
          last_updated: t.last_updated || new Date().toISOString(),
          size_mb: Number((t.size_mb ?? 0).toFixed ? t.size_mb : Number(t.size_mb || 0)),
          status: (t.status === 'active' ? 'active' : 'archived') as 'active' | 'archived'
        }));
        setRecords(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch database info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = records.filter(record =>
    record.table_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportTable = (tableName: string) => {
    console.log(`Exporting table: ${tableName}`);
    // Implement export functionality
  };

  const handleArchiveTable = (tableName: string) => {
    console.log(`Archiving table: ${tableName}`);
    // Implement archive functionality
  };

  const totalRecords = records.reduce((sum, record) => sum + record.record_count, 0);
  const totalSize = records.reduce((sum, record) => sum + record.size_mb, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Database Management</h1>
        <p className="text-gray-600 mt-2">Monitor and manage your database tables and records</p>
      </div>

      {/* Database Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tables</p>
              <p className="text-2xl font-bold text-gray-900">{records.length}</p>
            </div>
            <Database className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{totalRecords.toLocaleString()}</p>
            </div>
            <Database className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Database Size</p>
              <p className="text-2xl font-bold text-gray-900">{totalSize.toFixed(1)} MB</p>
            </div>
            <Database className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Tables</p>
              <p className="text-2xl font-bold text-gray-900">
                {records.filter(r => r.status === 'active').length}
              </p>
            </div>
            <Database className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search tables..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchDatabaseInfo}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Database Tables */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Database Tables</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 mt-2">Loading database information...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Database className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-gray-900">{record.table_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.record_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.size_mb.toFixed(1)} MB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.last_updated)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        record.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleExportTable(record.table_name)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                      {record.status === 'active' && (
                        <button
                          onClick={() => handleArchiveTable(record.table_name)}
                          className="text-orange-600 hover:text-orange-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};