import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getAdminApp, upsertAdminScreen, deleteAdminScreen } from '@/api/adminApps';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function AdminAppScreens() {
  const query = useQuery();
  const appId = query.get('appId');

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newScreenName, setNewScreenName] = useState('');
  const [creating, setCreating] = useState(false);

  const screens = useMemo(() => (app?.screens || []), [app]);

  const refresh = async () => {
    const data = await getAdminApp(appId);
    setApp(data);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getAdminApp(appId);
        if (!mounted) return;
        setApp(data);
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load app');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [appId]);

  const onCreate = async () => {
    const name = (newScreenName || '').trim();
    if (!name) return;
    try {
      setCreating(true);
      setError('');
      await upsertAdminScreen(appId, name, {
        fieldNames: [],
        methodSignatures: [],
        elements: [],
        methods: []
      });
      setNewScreenName('');
      await refresh();
    } catch (e) {
      setError(e?.message || 'Failed to create screen');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (screenName) => {
    const ok = window.confirm(`Delete screen "${screenName}"?`);
    if (!ok) return;
    try {
      setError('');
      await deleteAdminScreen(appId, screenName);
      await refresh();
    } catch (e) {
      setError(e?.message || 'Failed to delete screen');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Screens</h1>
          <p className="text-slate-500 text-sm">Manage screen metadata for this app.</p>
        </div>
        <Link to={createPageUrl(`AdminAppDetails?appId=${appId}`)}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{loading ? <Skeleton className="h-6 w-64" /> : (app?.name || 'App')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {!loading && error && <div className="text-sm text-red-600">{error}</div>}

          {!loading && !error && (
            <>
              <div className="flex items-center gap-3">
                <Input
                  value={newScreenName}
                  onChange={(e) => setNewScreenName(e.target.value)}
                  placeholder="New screen name (e.g. homepage)"
                />
                <Button onClick={onCreate} disabled={creating || !(newScreenName || '').trim()}>
                  {creating ? 'Creating…' : 'Create'}
                </Button>
              </div>

              {screens.length === 0 ? (
                <div className="text-sm text-slate-500">No screens yet.</div>
              ) : (
                <div className="divide-y">
                  {screens
                    .slice()
                    .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
                    .map((s) => (
                      <div key={s.id || s.name} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">{s.name}</div>
                          <div className="text-xs text-slate-500">
                            fields: {(s.fieldNames || []).length} • signatures: {(s.methodSignatures || []).length} • elements: {(s.elements || []).length} • methods: {(s.methods || []).length}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link to={createPageUrl(`AdminScreenEditor?appId=${appId}&screenName=${encodeURIComponent(s.name)}`)}>
                            <Button variant="outline" size="sm">Edit</Button>
                          </Link>
                          <Button variant="destructive" size="sm" onClick={() => onDelete(s.name)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


