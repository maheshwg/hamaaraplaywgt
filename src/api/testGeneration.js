import { Auth } from '@/api/auth.js';

// Keep consistent with other API modules (adminApps.js)
const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'http://3.137.217.41:8080' : '');

function authHeaders() {
  const token = Auth.getToken();
  if (token) Auth.touch();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function generateTestFromFlow({ appId, appName, appUrl, flowText }) {
  const res = await fetch(`${API_BASE}/api/tests/generate-from-flow`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ appId, appName, appUrl, flowText })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to generate steps (${res.status}): ${text}`);
  }
  return res.json();
}


