import React from 'react';
import { useState, useEffect } from 'react';
import { Package, ExternalLink } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import EnhancedTrackingStatus from './EnhancedTrackingStatus';

interface Return {
  _id: string;
  return_id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  return_reason: string;
  status: string;
  shipping_partner: string;
  tracking_number: string;
  initiated_date: string;
  expected_delivery: string;
  refund_amount: number;
  priority: 'high' | 'medium' | 'low';
  // Tracking information
  trackingData?: any;
  deliveryStatus?: string;
  currentLocation?: string;
  lastTrackingUpdate?: string;
  raw?: Record<string, any>;
  normalized?: Record<string, any>;
}

export const ReturnsTable: React.FC = () => {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [mismatches, setMismatches] = useState<{ id: string; ajio: string; ours: string }[]>([]);
  const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [refundRange, setRefundRange] = useState<{ min?: number; max?: number }>({});
  const [onlyMismatch, setOnlyMismatch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, [page, pageSize, statusFilter, partnerFilter, searchQuery, dateRange.from, dateRange.to, refundRange.min, refundRange.max, onlyMismatch]);

  // Debounced auto-apply when filters change; also reset to first page
  useEffect(() => {
    setPage(1);
    const t = setTimeout(() => {
      fetchReturns();
    }, 300);
    return () => clearTimeout(t);
  }, [statusFilter, partnerFilter, searchQuery, dateRange.from, dateRange.to, refundRange.min, refundRange.max, onlyMismatch]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: pageSize === -1 ? 'all' : String(pageSize) });
      if (statusFilter) params.append('status', statusFilter);
      if (partnerFilter) params.append('partner', partnerFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (dateRange.from) params.append('fromDate', dateRange.from);
      if (dateRange.to) params.append('toDate', dateRange.to);
      if (refundRange.min !== undefined) params.append('minRefund', String(refundRange.min));
      if (refundRange.max !== undefined) params.append('maxRefund', String(refundRange.max));
      if (onlyMismatch) params.append('mismatch', 'true');
      const response = await fetch(`/returns?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Map MongoDB data to component interface
        const mappedReturns: Return[] = data.items.map((item: any) => ({
          _id: item._id,
          return_id: item.returnId || item.return_id,
          order_id: item.orderId || item.order_id,
          customer_name: item.customerName || item.customer_name,
          customer_email: item.customerEmail || item.customer_email,
          product_name: item.productName || item.product_name,
          return_reason: item.returnReason || item.return_reason || '',
          status: item.status,
          shipping_partner: item.shippingPartner || item.shipping_partner || '',
          tracking_number: item.trackingNumber || item.tracking_number || '',
          initiated_date: item.initiatedDate || item.initiated_date || '',
          expected_delivery: item.expectedDelivery || item.expected_delivery || '',
          refund_amount: item.refundAmount ?? item.refund_amount ?? 0,
          priority: (item.priority === 'high' ? 'high' : item.priority === 'low' ? 'low' : 'medium') as 'high' | 'medium' | 'low',
          raw: item.rawRow,
          normalized: item.normalizedRow
        }));
        setReturns(mappedReturns);
        setTotal(data.total);

        // Build dynamic columns from raw rows (union of keys across items on this page)
        const colSet = new Set<string>();
        mappedReturns.forEach(r => {
          Object.keys(r.raw || {}).forEach(k => colSet.add(k));
        });
        setDynamicColumns(Array.from(colSet));

        // Normalize and compute mismatches between Ajio status and our status
        const normalizeReturnStatus = (s: string) => {
          const v = (s || '').toString().trim().toLowerCase();
          if (!v) return '';
          // group common synonyms
          if (/(delivered\s*to\s*warehouse|return\s*delivered|delivered)/.test(v)) return 'return_delivered';
          if (/(quality\s*check|qc)/.test(v)) return 'quality_check';
          if (/(in\s*transit|ofd|out\s*for\s*delivery|received|arrival|arrived|facility|shipment\s*received)/.test(v)) return 'in_transit';
          if (/(pickup|picked\s*up|pickup\s*scheduled)/.test(v)) return 'pickup_scheduled';
          if (/(reject|rejected|cancel)/.test(v)) return 'rejected';
          if (/(refund|refunded|completed|closed|settled|processed|finished)/.test(v)) return 'refunded';
          if (/(initiated|new|pending|open|processing)/.test(v)) return 'initiated';
          return v;
        };

        const mm = mappedReturns.map(r => {
          const ajioStatus = (r.status || '').toString();
          const ourStatus = (r.normalized?.status || r.status || '').toString();
          return { id: r.return_id || r._id, ajio: ajioStatus, ours: ourStatus };
        }).filter(x => x.ajio && x.ours && normalizeReturnStatus(x.ajio) !== normalizeReturnStatus(x.ours));
        setMismatches(mm);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };
  const normalizeReturnStatus = (s: string) => {
    const v = (s || '').toString().trim().toLowerCase();
    if (!v) return '';
    // Group equivalences per requirement:
    // - Refunded and Return Delivered are the same group
    if (/(delivered\s*to\s*warehouse|return\s*delivered|delivered|refund|refunded|completed|closed|settled|processed|finished)/.test(v)) return 'completed_group';
    // - Initiated and In Transit are the same group
    if (/(in\s*transit|ofd|out\s*for\s*delivery|received|arrival|arrived|facility|shipment\s*received|initiated|new|pending|open|processing)/.test(v)) return 'in_progress_group';
    if (/(quality\s*check|qc)/.test(v)) return 'quality_check';
    if (/(pickup|picked\s*up|pickup\s*scheduled)/.test(v)) return 'pickup_scheduled';
    if (/(reject|rejected|cancel)/.test(v)) return 'rejected';
    return v;
  };


  // Load sellers for dropdown
  useEffect(() => {
    const loadSellers = async () => {
      try {
        const res = await fetch('/sellers', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (res.ok) {
          // Sellers data loaded but not used in current implementation
        }
      } catch (e) {
        console.error('Failed to load sellers', e);
      }
    };
    loadSellers();
  }, []);

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

  // const getPartnerName = (partner: string) => partner || 'N/A';

  const computeOurStatus = (r: Return) => {
    // Prefer normalized status from backend if provided
    const normalized = (r.normalized?.status || '').toString();
    if (normalized) return normalized;
    // Fallback heuristics
    if ((r.raw?.['3PL Delivery Status'] || '').toString().toLowerCase().includes('delivered')) return 'RETURN_DELIVERED';
    if (r.tracking_number) return 'IN_TRANSIT';
    return (r.status || 'INITIATED').toString();
  };

  // const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  // const formatDate = (dateString: string) => { /* unused after table redesign */ };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading returns from MongoDB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {mismatches.length > 0 && (
        <div className="px-6 py-3 bg-yellow-50 text-yellow-800 border-b border-yellow-200 text-sm">
          Mismatch detected for {mismatches.length} returns. Example: {mismatches.slice(0,3).map(m => `${m.id} (Ajio: ${m.ajio} vs Ours: ${m.ours})`).join('; ')}
        </div>
      )}
      <div className="p-4 lg:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Return Tracking ({returns.length} records)
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(true)} className="px-3 py-2 border rounded">Filters</button>
            <button
              onClick={async () => {
                try {
                  const resp = await fetch('/sync/returns?live=true', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                  });
                  if (resp.ok) await fetchReturns();
                } catch {}
              }}
              title="Sync Our Status by AWB"
              className="inline-flex items-center gap-2 px-3 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
            >
              Sync Status
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowFilters(false)}>Close</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-center">
                <input type="text" placeholder="Search returns, order, tracking..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-3 py-2 border rounded w-full" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded w-full">
                  <option value="">All Status</option>
                  <option value="initiated">Initiated</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered_to_warehouse">Delivered to WH</option>
                  <option value="quality_check">Quality Check</option>
                  <option value="refunded">Refunded</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)} className="px-3 py-2 border rounded w-full">
                  <option value="">All Partners</option>
                  <option value="DELHIVERY">Delhivery</option>
                  <option value="SHADOWFAX">Shadowfax</option>
                  <option value="XPRESSBEES">Xpressbees</option>
                  <option value="BLUEDART">Bluedart</option>
                  <option value="DTDC">DTDC</option>
                  <option value="ECOM">ECOM</option>
                </select>
                <input type="date" value={dateRange.from} onChange={(e) => setDateRange(r => ({ ...r, from: e.target.value }))} className="px-3 py-2 border rounded w-full" />
                <input type="date" value={dateRange.to} onChange={(e) => setDateRange(r => ({ ...r, to: e.target.value }))} className="px-3 py-2 border rounded w-full" />
                <div className="flex items-center gap-3 col-span-full">
                  <input type="number" placeholder="Min Refund" value={refundRange.min ?? ''} onChange={(e) => setRefundRange(a => ({ ...a, min: e.target.value ? Number(e.target.value) : undefined }))} className="w-full px-3 py-2 border rounded" />
                  <input type="number" placeholder="Max Refund" value={refundRange.max ?? ''} onChange={(e) => setRefundRange(a => ({ ...a, max: e.target.value ? Number(e.target.value) : undefined }))} className="w-full px-3 py-2 border rounded" />
                </div>
                <label className="flex items-center gap-2 text-sm col-span-full sm:col-span-1"><input type="checkbox" checked={onlyMismatch} onChange={(e) => setOnlyMismatch(e.target.checked)} /> Only mismatches</label>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => setShowFilters(false)} className="px-3 py-2 border rounded">Close</button>
                <button onClick={() => { setPage(1); setShowFilters(false); fetchReturns(); }} className="px-3 py-2 bg-blue-600 text-white rounded">Apply</button>
                <button onClick={() => { setSearchQuery(''); setStatusFilter(''); setPartnerFilter(''); setDateRange({ from:'', to:'' }); setRefundRange({}); setOnlyMismatch(false); setPage(1); fetchReturns(); }} className="px-3 py-2 border rounded">Reset</button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto w-full">
        <table className="min-w-[1200px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ajio Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Our Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mismatch</th>
              {dynamicColumns.map(col => (
                <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking Link</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Live Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {returns.length === 0 && (
              <tr>
                <td colSpan={6 + dynamicColumns.length + 1} className="px-6 py-8 text-center text-gray-500">
                  No returns found. Upload an RTV return report to see data here.
                </td>
              </tr>
            )}
            {returns.map((returnItem) => (
              <tr key={returnItem._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{returnItem.return_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{returnItem.order_id}</td>
                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={returnItem.status} /></td>
                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={returnItem.trackingData?.status || computeOurStatus(returnItem)} /></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {(() => {
                    const aj = (returnItem.status || '').toString();
                    const ours = (returnItem.trackingData?.status || computeOurStatus(returnItem)).toString();
                    return normalizeReturnStatus(aj) !== normalizeReturnStatus(ours) ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Mismatch</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">OK</span>
                    );
                  })()}
                </td>
                {dynamicColumns.map(col => (
                  <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {String((returnItem.raw || {})[col] ?? '')}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {(() => {
                    const url = getTrackingUrl(returnItem.shipping_partner, returnItem.tracking_number);
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
                  {returnItem.return_id ? (
                    <EnhancedTrackingStatus 
                      orderId={returnItem.return_id}
                      compact={true}
                      autoRefresh={false}
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">No Return ID</span>
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
            onChange={(e) => { const v = parseInt(e.target.value); setPageSize(v); setPage(1); }}
            className="px-2 py-1 border rounded"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={-1}>All</option>
          </select>
          <div className="flex items-center gap-2">
            <button disabled={page===1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
            <span className="text-sm">Page {page} / {Math.max(1, Math.ceil(total / (pageSize === -1 ? Math.max(total,1) : pageSize)))} </span>
            <button disabled={pageSize === -1 || page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p+1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* View modal removed per requirement; all fields are inline in the table */}
    </div>
  );
};