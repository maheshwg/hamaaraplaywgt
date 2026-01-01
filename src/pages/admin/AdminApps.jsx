import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { createAdminApp, listAdminApps } from '@/api/adminApps';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export default function AdminApps() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInfo, setNewInfo] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listAdminApps();
      setApps(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load apps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await load();
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = (q || '').trim().toLowerCase();
    if (!term) return apps;
    return apps.filter(a => (a?.name || '').toLowerCase().includes(term));
  }, [apps, q]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Apps</h1>
          <p className="text-slate-500 text-sm">Super Admin: manage app metadata and summary info.</p>
        </div>
        <Button variant="default" onClick={() => setCreating(v => !v)}>
          {creating ? 'Close' : 'Add App'}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>Create app</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-900">Name</div>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. testautomationpractice" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-900">Info (optional)</div>
              <Textarea value={newInfo} onChange={(e) => setNewInfo(e.target.value)} placeholder="Up to 4000 characters" />
              <div className="text-xs text-slate-500">{(newInfo || '').length}/4000</div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    setError('');
                    const created = await createAdminApp({ name: newName, info: newInfo });
                    setCreating(false);
                    setNewName('');
                    setNewInfo('');
                    await load();
                  } catch (e) {
                    setError(e?.message || 'Failed to create app');
                  }
                }}
                disabled={!newName.trim()}
              >
                Create
              </Button>
              <Button variant="outline" onClick={() => { setCreating(false); setNewName(''); setNewInfo(''); }}>
                Cancel
              </Button>
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>All apps</CardTitle>
          <div className="w-72">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by app name…" />
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!loading && error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-sm text-slate-500">No apps found.</div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="divide-y">
              {filtered.map(app => (
                <div key={app.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{app.name}</div>
                    <div className="text-xs text-slate-500">App ID: {app.id}</div>
                  </div>
                  <Link to={createPageUrl(`AdminAppDetails?appId=${app.id}`)}>
                    <Button variant="outline" size="sm">View / Edit</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


