import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getAdminApp, updateAdminAppInfo } from '@/api/adminApps';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function AdminAppDetails() {
  const query = useQuery();
  const appId = query.get('appId');

  const [app, setApp] = useState(null);
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        setSavedMsg('');
        const data = await getAdminApp(appId);
        if (!mounted) return;
        setApp(data);
        setInfo(data?.info || '');
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load app');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [appId]);

  const onSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSavedMsg('');
      const updated = await updateAdminAppInfo(appId, info);
      setApp(updated);
      setInfo(updated?.info || '');
      setSavedMsg('Saved');
      setTimeout(() => setSavedMsg(''), 1500);
    } catch (e) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">App Details</h1>
          <p className="text-slate-500 text-sm">Edit and save app summary/info (max 4000 chars).</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={createPageUrl(`AdminAppScreens?appId=${appId}`)}>
            <Button variant="outline">Manage Screens</Button>
          </Link>
          <Link to={createPageUrl('AdminApps')}>
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{loading ? <Skeleton className="h-6 w-64" /> : (app?.name || 'App')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {!loading && error && <div className="text-sm text-red-600">{error}</div>}

          {!loading && !error && (
            <>
              <div className="text-xs text-slate-500">App ID: {app?.id}</div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-800">Info</div>
                <Textarea
                  value={info}
                  onChange={(e) => setInfo(e.target.value)}
                  rows={10}
                  placeholder="Describe the app, screens, and any guidance used for screen inference…"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{(info || '').length} / 4000</span>
                  <span className="text-emerald-600">{savedMsg}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={onSave} disabled={saving || (info || '').length > 4000}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                {(info || '').length > 4000 && (
                  <div className="text-xs text-red-600">Info must be ≤ 4000 characters.</div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


