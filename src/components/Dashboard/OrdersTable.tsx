import React, { useState, useEffect } from 'react';
import { ExternalLink, Search, Download, RefreshCw } from 'lucide-react';
import EnhancedTrackingStatus from './EnhancedTrackingStatus';
import { StatusBadge } from './StatusBadge';

interface Order {
  _id: string;
  custOrderNo: string;
  fwdSellerOrderNo: string;
  status: string;
  fwdCarrier: string;
  fwdAwb: string;
  description: string;
  sellerSku: string;
  orderQty: number;
  shippedQty: number;
  cancelledQty: number;
  sellingPrice: number;
  invoiceValue: number;
  sellerInvoiceNo: string;
  custInvoiceNo: string;
  isPreInvoiceCancellation: boolean;
  isPostInvoiceCancellation: boolean;
  hasInvoiceDetails: boolean;
  custOrderDate: string;
  fwdShipmentDate: string;
  estimatedDispatchDate: string;
  jioCode: string;
  brand: string;
}

export const OrdersTable: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  // Summary removed from UI
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState<string>('');
  const [sellers, setSellers] = useState<Array<{ _id: string; name: string; brandName?: string }>>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [amountRange, setAmountRange] = useState<{ min: number | undefined; max: number | undefined }>({ min: undefined, max: undefined });
  const [flags, setFlags] = useState<{ hasInvoice: boolean; preInvoice: boolean; postInvoice: boolean }>({ hasInvoice: false, preInvoice: false, postInvoice: false });
  // Details modal removed; state no longer used
  const [mismatches, setMismatches] = useState<{ id: string; ajio: string; ours: string }[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);

  useEffect(() => {
    fetchOrders();
  }, [page, pageSize]);

  // Auto-fetch when filters change (debounced for search)
  useEffect(() => {
    setPage(1);
    const t = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, statusFilter, partnerFilter, sellerFilter, dateRange.from, dateRange.to, amountRange.min, amountRange.max, flags.hasInvoice, flags.preInvoice, flags.postInvoice]);

  useEffect(() => {
    setFilteredOrders(orders);
  }, [orders]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (partnerFilter) params.append('partner', partnerFilter);
      if (sellerFilter) params.append('sellerId', sellerFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (dateRange.from) params.append('fromDate', dateRange.from);
      if (dateRange.to) params.append('toDate', dateRange.to);
      if (amountRange.min) params.append('minInvoice', String(amountRange.min));
      if (amountRange.max) params.append('maxInvoice', String(amountRange.max));
      if (flags.hasInvoice) params.append('hasInvoiceDetails', 'true');
      if (flags.preInvoice) params.append('preInvoice', 'true');
      if (flags.postInvoice) params.append('postInvoice', 'true');
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));

      const response = await fetch(`/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data.items);
        setTotal(data.total);
        // summary not used in redesigned table

        // Build dynamic columns from item keys (flatten common fields)
        const colSet = new Set<string>();
        (data.items || []).forEach((it: any) => {
          Object.keys(it || {}).forEach((k) => {
            if (!['_id'].includes(k)) colSet.add(k);
          });
        });
        // We'll already render some canonical columns; remove them from dynamic
        ['custOrderNo','fwdSellerOrderNo','status','fwdCarrier','fwdAwb','invoiceValue','description','sellerSku','orderQty','custOrderDate','fwdShipmentDate','estimatedDispatchDate','brand','sellingPrice','isPreInvoiceCancellation','isPostInvoiceCancellation','hasInvoiceDetails','jioCode','currentLocation','trackingData','normalizedStatus','deliveryStatus'].forEach(k => colSet.delete(k));
        setDynamicColumns(Array.from(colSet));

        // Normalize and compute mismatches between Ajio and our status (same philosophy as returns)
        const normalizeOrderStatus = (s: string) => {
          const v = (s || '').toString().trim().toLowerCase();
          if (!v) return '';
          if (/(delivered|delivery\s*completed)/.test(v)) return 'delivered';
          if (/(out\s*for\s*delivery|ofd)/.test(v)) return 'out_for_delivery';
          if (/(in\s*transit|dispatched|shipped|received|arrival|arrived)/.test(v)) return 'shipped';
          if (/(picked\s*up|pickup)/.test(v)) return 'picked_up';
          if (/(cancel|cancelled|canceled)/.test(v)) return 'cancelled';
          if (/(exception|failed|undelivered)/.test(v)) return 'exception';
          if (/(pending|processing|booked)/.test(v)) return 'pending';
          return v;
        };

        const mm = (data.items || []).map((it: any) => {
          const ajio = (it.status || '').toString();
          const ours = (it.trackingData?.status || it.normalizedStatus || it.deliveryStatus || it.status || '').toString();
          const id = it.custOrderNo || it.fwdSellerOrderNo || it._id;
          return { id, ajio, ours };
        }).filter((x: any) => x.ajio && x.ours && normalizeOrderStatus(x.ajio) !== normalizeOrderStatus(x.ours));
        setMismatches(mm);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sellers list for dropdown
  useEffect(() => {
    const loadSellers = async () => {
      try {
        const res = await fetch('/sellers', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSellers(data || []);
        }
      } catch (e) {
        console.error('Failed to load sellers', e);
      }
    };
    loadSellers();
  }, []);
  
  const computeOurStatus = (o: any) => {
    // Prefer backend-provided normalized/tracking status
    const fromTracking = (o?.trackingData?.status || '').toString();
    const normalized = (o?.normalizedStatus || '').toString();
    const delivery = (o?.deliveryStatus || '').toString();
    if (fromTracking) return fromTracking;
    if (normalized) return normalized;
    if (delivery) return delivery;
    // Heuristic fallbacks
    const ajio = (o?.status || '').toString();
    const s = ajio.toLowerCase();
    if (s.includes('delivered')) return 'Delivered';
    if (!s.includes('cancel') && (o?.fwdAwb || '')) return 'Shipped';
    return ajio || 'Pending';
  };

  const getTrackingUrl = (partner: string, awb: string) => {
    const p = (partner || '').toUpperCase();
    if (!awb) return '';
    switch (p) {
      case 'DELHIVERY':
        return `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`;
      case 'SHADOWFAX':
        return `https://shadowfax.in/track/${encodeURIComponent(awb)}`;
      case 'XPRESSBEES':
        return `https://www.xpressbees.com/track/${encodeURIComponent(awb)}`;
      case 'BLUEDART':
        return `https://www.bluedart.com/tracking?awb=${encodeURIComponent(awb)}`;
      case 'DTDC':
        return `https://www.dtdc.in/tracking/tracking_results.asp?cnno=${encodeURIComponent(awb)}`;
      case 'ECOM':
      case 'ECOM EXPRESS':
        return `https://ecomexpress.in/tracking/?awb=${encodeURIComponent(awb)}`;
      default:
        return '';
    }
  };


  // client-side filtering removed; server handles filters


  // const getCancellationType = (order: Order) => null;

  // Details modal removed per requirement; all fields inline

  const handleExport = async () => {
    try {
      const response = await fetch(`/export/orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dropship_orders_export.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // const formatDate = (dateString: string) => '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders from MongoDB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Tracking ({filteredOrders.length} records)</h1>
          <p className="text-gray-600 mt-2">Real-time data from MongoDB database</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Filters
          </button>
          <button
            onClick={async () => {
              try {
                const resp = await fetch('/sync/orders?live=true', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                });
                if (resp.ok) await fetchOrders();
              } catch {}
            }}
            title="Sync Our Status by AWB"
            className="flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
          >
            Sync Status
          </button>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowFilters(false)}>Close</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search orders, AWB, SKU..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Shipped">Shipped</option>
              </select>

              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Sellers</option>
                {sellers.map(s => (
                  <option key={s._id} value={s._id}>{s.name}{s.brandName ? ` - ${s.brandName}` : ''}</option>
                ))}
              </select>

              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Partners</option>
                <option value="DELHIVERY">Delhivery</option>
                <option value="SHADOWFAX">Shadowfax</option>
                <option value="XPRESSBEES">Xpressbees</option>
              </select>

              <input type="date" value={dateRange.from} onChange={(e) => setDateRange(r => ({ ...r, from: e.target.value }))} className="w-full px-3 py-2 border rounded" />
              <input type="date" value={dateRange.to} onChange={(e) => setDateRange(r => ({ ...r, to: e.target.value }))} className="w-full px-3 py-2 border rounded" />

              <input type="number" placeholder="Min Invoice" value={amountRange.min ?? ''} onChange={(e) => setAmountRange(a => ({ ...a, min: e.target.value ? Number(e.target.value) : undefined }))} className="w-full px-3 py-2 border rounded" />
              <input type="number" placeholder="Max Invoice" value={amountRange.max ?? ''} onChange={(e) => setAmountRange(a => ({ ...a, max: e.target.value ? Number(e.target.value) : undefined }))} className="w-full px-3 py-2 border rounded" />

              <div className="flex items-center gap-4 px-1 col-span-full">
                <label className="flex items-center gap-2 text-sm whitespace-nowrap"><input type="checkbox" checked={flags.hasInvoice} onChange={(e) => setFlags(f => ({ ...f, hasInvoice: e.target.checked }))} /> Has Invoice</label>
                <label className="flex items-center gap-2 text-sm whitespace-nowrap"><input type="checkbox" checked={flags.preInvoice} onChange={(e) => setFlags(f => ({ ...f, preInvoice: e.target.checked }))} /> Pre-Inv Cancel</label>
                <label className="flex items-center gap-2 text-sm whitespace-nowrap"><input type="checkbox" checked={flags.postInvoice} onChange={(e) => setFlags(f => ({ ...f, postInvoice: e.target.checked }))} /> Post-Inv Cancel</label>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setShowFilters(false)} className="px-3 py-2 border rounded">Close</button>
              <button onClick={() => { setPage(1); setShowFilters(false); fetchOrders(); }} className="px-3 py-2 bg-blue-600 text-white rounded">Apply</button>
              <button onClick={() => { setSearchQuery(''); setStatusFilter(''); setPartnerFilter(''); setDateRange({ from:'', to:'' }); setAmountRange({ min: undefined, max: undefined }); setFlags({ hasInvoice:false, preInvoice:false, postInvoice:false }); setSellerFilter(''); setPage(1); fetchOrders(); }} className="px-3 py-2 border rounded">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {mismatches.length > 0 && (
          <div className="px-6 py-3 bg-yellow-50 text-yellow-800 border-b border-yellow-200 text-sm">
            Mismatch detected for {mismatches.length} orders. Example: {mismatches.slice(0,3).map(m => `${m.id} (Ajio: ${m.ajio} vs Ours: ${m.ours})`).join('; ')}
          </div>
        )}
        
~~~~        <div className="overflow-x-auto w-full">
          <table className="min-w-[1200px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ORDER ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FWD ORDER NO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AJIO STATUS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OUR STATUS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MISMATCH</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CARRIER</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AWB</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRODUCT NAME</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QUANTITY</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SELLING PRICE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">INVOICE VALUE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BRAND</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ORDER DATE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SHIPMENT DATE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ESTIMATED DISPATCH</th>
                {dynamicColumns.map(col => (
                  <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CURRENT LOCATION</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking Link</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Live Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order: any) => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{order.custOrderNo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.fwdSellerOrderNo}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge 
                      status={order.status} 
                      size="sm" 
                      showIcon={true}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge 
                      status={computeOurStatus(order)} 
                      size="sm" 
                      showIcon={true}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(() => {
                      const aj = (order.status || '').toString();
                      const ours = computeOurStatus(order);
                      const normalizeOrderStatus = (s: string) => {
                        const v = (s || '').toString().trim().toLowerCase();
                        if (!v) return '';
                        if (/(delivered|delivery\s*completed)/.test(v)) return 'delivered';
                        if (/(out\s*for\s*delivery|ofd)/.test(v)) return 'out_for_delivery';
                        if (/(in\s*transit|dispatched|shipped|received|arrival|arrived)/.test(v)) return 'shipped';
                        if (/(picked\s*up|pickup)/.test(v)) return 'picked_up';
                        if (/(cancel|cancelled|canceled)/.test(v)) return 'cancelled';
                        if (/(exception|failed|undelivered)/.test(v)) return 'exception';
                        if (/(pending|processing|booked)/.test(v)) return 'pending';
                        return v;
                      };
                      return normalizeOrderStatus(aj) !== normalizeOrderStatus(ours) ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Mismatch</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">OK</span>
                    );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.fwdCarrier || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{order.fwdAwb || 'No AWB'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate" title={order.description}>
                    {order.description || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{order.sellerSku || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.orderQty || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(order.sellingPrice || 0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(order.invoiceValue || 0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.brand || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.custOrderDate ? new Date(order.custOrderDate).toLocaleDateString('en-IN') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.fwdShipmentDate ? new Date(order.fwdShipmentDate).toLocaleDateString('en-IN') : 'N/A'}
                  </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.estimatedDispatchDate ? new Date(order.estimatedDispatchDate).toLocaleDateString('en-IN') : 'N/A'}
                  </td>
                  {dynamicColumns.map(col => (
                    <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {String((order || {})[col] ?? '')}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.trackingData?.currentLocation || order.currentLocation || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {(() => {
                      const url = getTrackingUrl(order.fwdCarrier, order.fwdAwb);
                      return (
                        <a
                          href={url || '#'}
                          target={url ? '_blank' : undefined}
                          rel={url ? 'noopener noreferrer' : undefined}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded transition-colors ${url ? 'text-green-600 hover:text-green-900 hover:bg-green-50' : 'text-gray-400 cursor-not-allowed'}`}
                          onClick={(e) => { if (!url) e.preventDefault(); }}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Track
                        </a>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.custOrderNo ? (
                      <EnhancedTrackingStatus 
                        orderId={order.custOrderNo}
                        compact={true}
                        autoRefresh={false}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">No Order ID</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); fetchOrders(); }}
              className="px-2 py-1 border rounded"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <div className="flex items-center gap-2">
              <button disabled={page===1} onClick={() => { setPage(p => Math.max(1, p-1)); }} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
              <span className="text-sm">Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
              <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => { setPage(p => p+1); }} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Details modal removed per requirement */}

      {/* Summary Stats removed per request */}
    </div>
  );
};