import { useEffect, useState } from 'react';
import { Auth } from '@/api/auth.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, UserPlus, Mail, User, Lock } from 'lucide-react';

const API_BASE = '/api';

export default function Team() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const loadUsers = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/client-admin/users`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` }
      });
      if (!res.ok) {
        throw new Error(`Failed to load users (${res.status})`);
      }
      const data = await res.json();
      setUsers(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createUser = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/client-admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Auth.getToken()}` },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to create user (${res.status})`);
      }
      
      // Reset form
      setFormData({ name: '', email: '', password: '' });
      await loadUsers();
    } catch (e) {
      setError(e.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    setError('');
    try {
      const res = await fetch(`${API_BASE}/client-admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${Auth.getToken()}` }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to delete user (${res.status})`);
      }
      
      await loadUsers();
    } catch (e) {
      setError(e.message || 'Failed to delete user');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Team Management</h2>
          <p className="text-slate-600 mt-1">Manage your organization's users</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add User Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </CardTitle>
          <CardDescription>Create a new user account for your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Name
              </Label>
              <Input
                id="userName"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="userEmail"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="userPassword"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <Button 
            onClick={createUser} 
            disabled={loading || !formData.name || !formData.email || !formData.password}
            className="w-full md:w-auto"
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>All users in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No users yet. Add your first team member above.</p>
          ) : (
            <div className="space-y-2">
              {users.map(user => (
                <div
                  key={user.id}
                  className="border rounded-lg px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-sm text-slate-600">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.tenantRole === 'CLIENT_ADMIN' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {user.tenantRole === 'CLIENT_ADMIN' ? 'Admin' : 'Member'}
                    </span>
                    {user.tenantRole !== 'CLIENT_ADMIN' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
