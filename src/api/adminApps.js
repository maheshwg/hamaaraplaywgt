import { Auth } from '@/api/auth.js';

// Same API base behavior as src/api/auth.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'http://3.137.217.41:8080' : '');

function authHeaders() {
  const token = Auth.getToken();
  if (token) Auth.touch();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function listAdminApps() {
  const res = await fetch(`${API_BASE}/api/admin/apps`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load apps (${res.status})`);
  return res.json();
}

export async function createAdminApp({ name, info }) {
  const res = await fetch(`${API_BASE}/api/admin/apps`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, info })
  });
  if (!res.ok) {
    let text = await res.text();
    throw new Error(`Failed to create app (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getAdminApp(appId) {
  const res = await fetch(`${API_BASE}/api/admin/apps/${appId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load app (${res.status})`);
  return res.json();
}

export async function updateAdminAppInfo(appId, info) {
  const res = await fetch(`${API_BASE}/api/admin/apps/${appId}/info`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ info })
  });
  if (!res.ok) {
    let text = await res.text();
    throw new Error(`Failed to save (${res.status}): ${text}`);
  }
  return res.json();
}

export async function upsertAdminScreen(appId, screenName, payload) {
  const res = await fetch(`${API_BASE}/api/admin/apps/${appId}/screens/${encodeURIComponent(screenName)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) {
    let text = await res.text();
    throw new Error(`Failed to save screen (${res.status}): ${text}`);
  }
  return res.json();
}

export async function deleteAdminScreen(appId, screenName) {
  const res = await fetch(`${API_BASE}/api/admin/apps/${appId}/screens/${encodeURIComponent(screenName)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    let text = await res.text();
    throw new Error(`Failed to delete screen (${res.status}): ${text}`);
  }
  return true;
}


