import React, { useEffect, useState } from 'react';

interface Seller {
  _id: string;
  name: string;
  brandName: string;
  pobIds: string[];
  isActive: boolean;
}

export const SellersPanel: React.FC = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Seller | null>(null);
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [pobInput, setPobInput] = useState('');

  const headers = { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' } as Record<string,string>;

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/sellers?search=${encodeURIComponent(search)}`, { headers: { 'Authorization': headers['Authorization'] } });
      if (res.ok) setSellers(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSellers(); }, []);

  const resetForm = () => { setEditing(null); setName(''); setBrandName(''); setPobInput(''); };

  const submit = async () => {
    const pobIds = Array.from(new Set(pobInput.split(/[\n,]/).map(s => s.trim()).filter(Boolean)));
    const body = JSON.stringify({ name, brandName, pobIds });
    const res = await fetch(editing ? `/sellers/${editing._id}` : '/sellers', { method: editing ? 'PUT' : 'POST', headers, body });
    if (res.ok) { resetForm(); await fetchSellers(); }
  };

  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/sellers/import', { method: 'POST', headers: { 'Authorization': headers['Authorization'] }, body: form as any });
    if (res.ok) { await fetchSellers(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sellers</h1>
        <p className="text-gray-600 mt-2">Manage seller Name, Brand, and multiple POB IDs</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Seller Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Brand Name</label>
              <input value={brandName} onChange={e=>setBrandName(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm text-gray-700 mb-1">POB IDs (comma or newline separated)</label>
              <textarea value={pobInput} onChange={e=>setPobInput(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded" placeholder="POB123, POB456\nPOB789" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editing ? 'Update' : 'Add'} Seller</button>
            {editing && <button onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') fetchSellers(); }} placeholder="Search seller/brand/POB" className="px-3 py-2 border rounded w-64" />
          <div className="flex items-center gap-3">
            <button onClick={fetchSellers} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">Search</button>
            <label className="px-3 py-2 bg-blue-50 text-blue-700 rounded cursor-pointer">
              Upload Excel
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e=>{ const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
            </label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Seller</th>
                <th className="text-left py-3 px-4">Brand</th>
                <th className="text-left py-3 px-4">POB IDs</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map(s => (
                <tr key={s._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{s.name}</td>
                  <td className="py-3 px-4">{s.brandName}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{s.pobIds.join(', ')}</td>
                  <td className="py-3 px-4 flex gap-2">
                    <button onClick={()=>{ setEditing(s); setName(s.name); setBrandName(s.brandName); setPobInput(s.pobIds.join('\n')); }} className="px-3 py-1 bg-blue-50 text-blue-700 rounded">Edit</button>
                    <button onClick={async ()=>{ await fetch(`/sellers/${s._id}`, { method: 'DELETE', headers: { 'Authorization': headers['Authorization'] } }); fetchSellers(); }} className="px-3 py-1 bg-red-50 text-red-700 rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="text-sm text-gray-500 mt-4">Loading...</div>}
      </div>
    </div>
  );
};

export default SellersPanel;


