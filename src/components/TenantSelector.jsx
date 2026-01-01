import React, { useEffect, useState } from 'react';
import { Auth } from '@/api/auth.js';

export default function TenantSelector({ onChange }) {
  const [tenants, setTenants] = useState([]);
  const [selected, setSelected] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('selectedTenantId') || '' : ''
  );

  useEffect(() => {
    async function loadTenants() {
      try {
        Auth.touch();
        const res = await fetch('/api/admin/tenants', {
          headers: { Authorization: `Bearer ${Auth.getToken()}` }
        });
        const data = await res.json();
        setTenants(data || []);
      } catch (e) {
        console.error('Failed to load tenants', e);
      }
    }
    loadTenants();
  }, []);

  useEffect(() => {
    if (selected) {
      localStorage.setItem('selectedTenantId', selected);
      onChange && onChange(selected);
    }
  }, [selected, onChange]);

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-500">Tenant</label>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="text-sm border rounded-md px-2 py-1 bg-white"
      >
        <option value="">Select...</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>{t.name || `Tenant ${t.id}`}</option>
        ))}
      </select>
    </div>
  );
}
