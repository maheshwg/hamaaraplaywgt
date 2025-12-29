import { useState } from 'react';
import { Auth, loginSuperAdmin } from '@/api/auth.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
  const [username, setUsername] = useState('abc@abc.com');
  const [password, setPassword] = useState('abc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onLogin = async () => {
    setLoading(true); setError('');
    try {
      const response = await loginSuperAdmin(username, password);
      if (!response.token) throw new Error('No token returned');
      
      // Decode JWT to extract role
      const base64Url = response.token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
      const payload = JSON.parse(jsonPayload);
      const role = payload.role || 'MEMBER';
      
      // Store authentication data
      Auth.setToken(response.token);
      Auth.setRole(role);
      
      // Store user details
      if (response.userId) {
        localStorage.setItem('userId', response.userId.toString());
      }
      if (response.tenantId) {
        localStorage.setItem('selectedTenantId', response.tenantId.toString());
      }
      if (response.email) {
        localStorage.setItem('userEmail', response.email);
      }
      if (response.name) {
        localStorage.setItem('userName', response.name);
      }
      
      // Route to Tests page
      window.location.href = '/tests';
    } catch (e) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login (Dev)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-slate-600">Username</label>
            <input className="mt-1 w-full border rounded px-3 py-2" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Password</label>
            <input type="password" className="mt-1 w-full border rounded px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button disabled={loading} onClick={onLogin} className="w-full">{loading ? 'Signing in...' : 'Sign In'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
