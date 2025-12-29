import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getAdminApp, upsertAdminScreen } from '@/api/adminApps';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function linesToList(s) {
  return (s || '')
    .split('\n')
    .map(x => x.trim())
    .filter(Boolean);
}

function listToLines(arr) {
  return (Array.isArray(arr) ? arr : []).join('\n');
}

export default function AdminScreenEditor() {
  const query = useQuery();
  const appId = query.get('appId');
  const screenName = query.get('screenName') || '';

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const [fieldNamesText, setFieldNamesText] = useState('');
  const [methodSignaturesText, setMethodSignaturesText] = useState('');
  const [elementsJsonText, setElementsJsonText] = useState('[]');
  const [methodsJsonText, setMethodsJsonText] = useState('[]');

  const screen = useMemo(() => {
    const screens = app?.screens || [];
    return screens.find(s => (s?.name || '').toLowerCase() === (screenName || '').toLowerCase()) || null;
  }, [app, screenName]);

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

        const s = (data?.screens || []).find(x => (x?.name || '').toLowerCase() === (screenName || '').toLowerCase());
        setFieldNamesText(listToLines(s?.fieldNames));
        setMethodSignaturesText(listToLines(s?.methodSignatures));
        setElementsJsonText(JSON.stringify(s?.elements || [], null, 2));
        setMethodsJsonText(JSON.stringify(s?.methods || [], null, 2));
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load screen');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [appId, screenName]);

  const onSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSavedMsg('');

      const payload = {
        fieldNames: linesToList(fieldNamesText),
        methodSignatures: linesToList(methodSignaturesText),
        elements: JSON.parse(elementsJsonText || '[]'),
        methods: JSON.parse(methodsJsonText || '[]'),
      };

      await upsertAdminScreen(appId, screenName, payload);
      setSavedMsg('Saved');
      setTimeout(() => setSavedMsg(''), 1500);

      // refresh view
      const data = await getAdminApp(appId);
      setApp(data);
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
          <h1 className="text-2xl font-bold text-slate-900">Screen Editor</h1>
          <p className="text-slate-500 text-sm">Edit screen fields, method signatures, elements and method metadata.</p>
        </div>
        <Link to={createPageUrl(`AdminAppScreens?appId=${appId}`)}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? <Skeleton className="h-6 w-72" /> : `${app?.name || 'App'} / ${screen?.name || screenName}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {!loading && error && <div className="text-sm text-red-600">{error}</div>}
          {!loading && savedMsg && <div className="text-sm text-emerald-600">{savedMsg}</div>}

          {!loading && !error && (
            <>
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-800">Field names (one per line)</div>
                <Textarea value={fieldNamesText} onChange={(e) => setFieldNamesText(e.target.value)} rows={6} />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-800">Method signatures (one per line)</div>
                <Textarea value={methodSignaturesText} onChange={(e) => setMethodSignaturesText(e.target.value)} rows={6} />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-800">Elements JSON</div>
                <div className="text-xs text-slate-500">
                  Each element: elementName, selectorType, selector, frameSelector(optional), elementType, actionsSupported[]
                </div>
                <Textarea value={elementsJsonText} onChange={(e) => setElementsJsonText(e.target.value)} rows={10} className="font-mono text-xs" />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-800">Methods JSON</div>
                <div className="text-xs text-slate-500">
                  Each method: methodName, methodSignature(optional), returnHandling, sideEffectFlags[], params[]
                </div>
                <Textarea value={methodsJsonText} onChange={(e) => setMethodsJsonText(e.target.value)} rows={10} className="font-mono text-xs" />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={onSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


