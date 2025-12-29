import { useState } from 'react';
import { Auth } from '@/api/auth.js';
import { Button } from '@/components/ui/button';

export default function Billing() {
  const tenantId = localStorage.getItem('selectedTenantId') || '';
  const [maxSeats, setMaxSeats] = useState(5);
  const [loading, setLoading] = useState(false);

  const updateSeats = async () => {
    setLoading(true);
    await fetch(`/api/admin/tenants/${tenantId}/seats?maxSeats=${maxSeats}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${Auth.getToken()}` }
    });
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Billing</h2>
      {!tenantId && <div className="text-sm text-slate-600">Select a tenant first.</div>}
      {tenantId && (
        <div className="flex gap-2">
          <input type="number" className="border rounded px-3 py-2 w-28" value={maxSeats} onChange={e => setMaxSeats(parseInt(e.target.value||'0'))} />
          <Button onClick={updateSeats} disabled={loading}>{loading ? 'Saving...' : 'Update Seats'}</Button>
        </div>
      )}
    </div>
  );
}
