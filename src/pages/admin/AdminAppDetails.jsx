import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getAdminApp, updateAdminAppInfo, updateAdminAppPluginSettings, describeAdminAppPlugin, deleteAdminApp } from '@/api/adminApps';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function AdminAppDetails() {
  const query = useQuery();
  const appId = query.get('appId');
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPlugin, setSavingPlugin] = useState(false);
  const [validatingPlugin, setValidatingPlugin] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [savedPluginMsg, setSavedPluginMsg] = useState('');
  const [pluginValidation, setPluginValidation] = useState(null);

  const [executionMode, setExecutionMode] = useState('DB_METHOD_BODY');
  const [pluginJarPath, setPluginJarPath] = useState('');
  const [pluginVersion, setPluginVersion] = useState('');
  const [pluginSha256, setPluginSha256] = useState('');

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
        setExecutionMode(data?.executionMode || 'DB_METHOD_BODY');
        setPluginJarPath(data?.pluginJarPath || '');
        setPluginVersion(data?.pluginVersion || '');
        setPluginSha256(data?.pluginSha256 || '');
        setPluginValidation(null);
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

  const onSavePlugin = async () => {
    try {
      setSavingPlugin(true);
      setError('');
      setSavedPluginMsg('');
      const updated = await updateAdminAppPluginSettings(appId, {
        executionMode,
        pluginJarPath,
        pluginVersion,
        pluginSha256
      });
      setApp(updated);
      setExecutionMode(updated?.executionMode || 'DB_METHOD_BODY');
      setPluginJarPath(updated?.pluginJarPath || '');
      setPluginVersion(updated?.pluginVersion || '');
      setPluginSha256(updated?.pluginSha256 || '');
      setSavedPluginMsg('Saved');
      setTimeout(() => setSavedPluginMsg(''), 1500);
    } catch (e) {
      setError(e?.message || 'Failed to save plugin settings');
    } finally {
      setSavingPlugin(false);
    }
  };

  const onValidatePlugin = async () => {
    try {
      setValidatingPlugin(true);
      setError('');
      const data = await describeAdminAppPlugin(appId);
      setPluginValidation(data);
    } catch (e) {
      setPluginValidation(null);
      setError(e?.message || 'Failed to validate plugin');
    } finally {
      setValidatingPlugin(false);
    }
  };

  const onDeleteApp = async () => {
    const name = app?.name || appId;
    const ok = window.confirm(
      `Delete app "${name}"?\n\nThis will delete its screen registry (screens/elements/methods) and unlink tests that reference it.`
    );
    if (!ok) return;
    try {
      setDeleting(true);
      setError('');
      await deleteAdminApp(appId);
      navigate(createPageUrl('AdminApps'));
    } catch (e) {
      setError(e?.message || 'Failed to delete app');
    } finally {
      setDeleting(false);
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
          <Button variant="destructive" onClick={onDeleteApp} disabled={loading || deleting || !appId}>
            {deleting ? 'Deleting…' : 'Delete app'}
          </Button>
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

      <Card>
        <CardHeader>
          <CardTitle>Execution / Plugin Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-800">Execution mode</div>
                <Select value={executionMode} onValueChange={setExecutionMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose execution mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DB_METHOD_BODY">DB_METHOD_BODY (current stored methodBody)</SelectItem>
                    <SelectItem value="JAR_PLUGIN">JAR_PLUGIN (compiled page objects)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-slate-500">
                  Controls how <span className="font-mono">call_method</span> steps execute for this app.
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-800">Plugin jar path</div>
                <Input
                  value={pluginJarPath}
                  onChange={(e) => setPluginJarPath(e.target.value)}
                  placeholder="plugins/saucedemo-plugin-1.0.0.jar"
                />
                <div className="text-xs text-slate-500">
                  Relative to backend working dir. Recommended under <span className="font-mono">backend/plugins/</span>.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-800">Plugin version</div>
                  <Input
                    value={pluginVersion}
                    onChange={(e) => setPluginVersion(e.target.value)}
                    placeholder="1.0.0"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-800">Plugin SHA-256 (optional)</div>
                  <Input
                    value={pluginSha256}
                    onChange={(e) => setPluginSha256(e.target.value)}
                    placeholder="hex sha256"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={onSavePlugin} disabled={savingPlugin}>
                  {savingPlugin ? 'Saving…' : 'Save plugin settings'}
                </Button>
                <Button variant="outline" onClick={onValidatePlugin} disabled={validatingPlugin}>
                  {validatingPlugin ? 'Validating…' : 'Validate plugin'}
                </Button>
                <span className="text-xs text-emerald-600">{savedPluginMsg}</span>
              </div>

              {pluginValidation && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-800">Validation result</div>
                  <pre className="text-xs bg-slate-50 border rounded-md p-3 overflow-auto max-h-80">
                    {JSON.stringify(pluginValidation, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


