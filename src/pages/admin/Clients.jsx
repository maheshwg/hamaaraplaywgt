import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@/api/auth.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Plus, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const API_BASE = '/api';

export default function Clients() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Form state for creating client with admin
  const [formData, setFormData] = useState({
    clientName: '',
    maxSeats: 5,
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });

  const load = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/tenants`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` }
      });
      if (!res.ok) {
        throw new Error(`Failed to load clients (${res.status})`);
      }
      const data = await res.json();
      setTenants(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load clients');
    }
  };

  useEffect(() => { load(); }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createClientWithAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/tenants/with-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Auth.getToken()}` },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        throw new Error(`Failed to create client (${res.status})`);
      }
      // Reset form
      setFormData({
        clientName: '',
        maxSeats: 5,
        adminName: '',
        adminEmail: '',
        adminPassword: ''
      });
      setCreateDialogOpen(false);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const viewClient = (clientId) => {
    navigate(`/AdminClientDetails?id=${clientId}`);
  };

  const getStatusBadge = (tenant) => {
    // Determine status based on seat usage
    const seatUsagePercent = (tenant.usedSeats / tenant.maxSeats) * 100;
    if (seatUsagePercent >= 90) {
      return <Badge variant="destructive">Full</Badge>;
    } else if (seatUsagePercent >= 70) {
      return <Badge variant="default">Active</Badge>;
    } else {
      return <Badge variant="secondary">Active</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Clients</h2>
          <p className="text-sm text-slate-500 mt-1">Manage all client organizations and their subscriptions</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Client</DialogTitle>
              <DialogDescription>
                Create a new client organization with an admin user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxSeats">Max Seats *</Label>
                  <Input
                    id="maxSeats"
                    type="number"
                    min="1"
                    value={formData.maxSeats}
                    onChange={(e) => handleInputChange('maxSeats', parseInt(e.target.value || '5'))}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Client Admin Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Admin Name *</Label>
                    <Input
                      id="adminName"
                      value={formData.adminName}
                      onChange={(e) => handleInputChange('adminName', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email *</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                      placeholder="admin@acme.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Admin Password *</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createClientWithAdmin} 
                disabled={loading || !formData.clientName || !formData.adminName || !formData.adminEmail || !formData.adminPassword}
              >
                {loading ? 'Creating...' : 'Create Client & Admin'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>Browse and manage all client organizations</CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
              <p className="text-sm text-slate-500 mb-4">Get started by creating your first client organization</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Client
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Seats (Used / Total)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map(tenant => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {tenant.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Standard</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tenant.usedSeats} / {tenant.maxSeats}</span>
                        <span className="text-xs text-slate-500">
                          ({tenant.maxSeats - tenant.usedSeats} available)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(tenant)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewClient(tenant.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View / Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
