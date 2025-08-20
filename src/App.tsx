import React, { useState, useMemo } from 'react';
import { BarChart3, Package, TrendingUp, Clock, DollarSign, Users, ArrowUpRight } from 'lucide-react';
import { MetricsCard } from './components/Dashboard/MetricsCard';
import { ReturnsTable } from './components/Dashboard/ReturnsTable';
import { SearchAndFilters } from './components/Dashboard/SearchAndFilters';
import { ShippingPartners } from './components/Dashboard/ShippingPartners';
import { ReturnDetailsModal } from './components/Dashboard/ReturnDetailsModal';
import { mockReturns, mockMetrics, mockShippingPartners } from './data/mockData';
import { Return, FilterOptions } from './types/dashboard';

function App() {
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    partner: '',
    priority: '',
    dateRange: '',
    searchQuery: ''
  });

  // Filter returns based on current filters
  const filteredReturns = useMemo(() => {
    return mockReturns.filter(returnItem => {
      const matchesStatus = !filters.status || returnItem.status === filters.status;
      const matchesPartner = !filters.partner || returnItem.shippingPartner === filters.partner;
      const matchesPriority = !filters.priority || returnItem.priority === filters.priority;
      const matchesSearch = !filters.searchQuery || 
        returnItem.id.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        returnItem.orderId.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        returnItem.customerName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        returnItem.productName.toLowerCase().includes(filters.searchQuery.toLowerCase());

      return matchesStatus && matchesPartner && matchesPriority && matchesSearch;
    });
  }, [filters]);

  const handleViewDetails = (returnItem: Return) => {
    setSelectedReturn(returnItem);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedReturn(null);
    setIsModalOpen(false);
  };

  const handleRefresh = () => {
    // In a real app, this would refetch data from the API
    console.log('Refreshing data...');
  };

  const handleExport = () => {
    // In a real app, this would export the data
    console.log('Exporting data...');
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Return ID,Order ID,Customer Name,Product,Status,Partner,Amount\n"
      + filteredReturns.map(r => 
          `${r.id},${r.orderId},${r.customerName},${r.productName},${r.status},${r.shippingPartner},${r.refundAmount}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ajio_returns_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Ajio Returns Dashboard</h1>
              <p className="text-sm text-gray-500">Track and manage returns across shipping partners</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live Updates
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <div className="xl:col-span-2">
            <MetricsCard
              title="Total Returns"
              value={mockMetrics.totalReturns}
              change={12}
              changeType="positive"
              icon={<Package className="h-6 w-6" />}
              color="blue"
            />
          </div>
          <div className="xl:col-span-2">
            <MetricsCard
              title="Pending Returns"
              value={mockMetrics.pendingReturns}
              change={5}
              changeType="negative"
              icon={<Clock className="h-6 w-6" />}
              color="orange"
            />
          </div>
          <div className="xl:col-span-2">
            <MetricsCard
              title="Success Rate"
              value={`${mockMetrics.successRate}%`}
              change={2.3}
              changeType="positive"
              icon={<TrendingUp className="h-6 w-6" />}
              color="green"
            />
          </div>
          <div className="xl:col-span-2">
            <MetricsCard
              title="Total Refund Amount"
              value={formatCurrency(mockMetrics.totalRefundAmount)}
              change={8}
              changeType="positive"
              icon={<DollarSign className="h-6 w-6" />}
              color="purple"
            />
          </div>
          <div className="xl:col-span-2">
            <MetricsCard
              title="Avg Processing Time"
              value={`${mockMetrics.avgProcessingTime} days`}
              change={1.2}
              changeType="negative"
              icon={<Clock className="h-6 w-6" />}
              color="blue"
            />
          </div>
          <div className="xl:col-span-2">
            <MetricsCard
              title="Completed Returns"
              value={mockMetrics.completedReturns}
              change={15}
              changeType="positive"
              icon={<BarChart3 className="h-6 w-6" />}
              color="green"
            />
          </div>
        </div>

        {/* Search and Filters */}
        <SearchAndFilters
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={handleRefresh}
          onExport={handleExport}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Returns Table */}
          <div className="lg:col-span-2">
            <ReturnsTable
              returns={filteredReturns}
              onViewDetails={handleViewDetails}
            />
          </div>

          {/* Shipping Partners */}
          <div className="lg:col-span-1">
            <ShippingPartners partners={mockShippingPartners} />
          </div>
        </div>

        {/* Results Summary */}
        <div className="text-center text-gray-500 text-sm">
          Showing {filteredReturns.length} of {mockReturns.length} returns
          {filters.searchQuery || filters.status || filters.partner || filters.priority ? (
            <span> (filtered)</span>
          ) : null}
        </div>
      </main>

      {/* Return Details Modal */}
      <ReturnDetailsModal
        returnItem={selectedReturn}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

export default App;
