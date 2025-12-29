import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Auth } from '@/api/auth.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserPlus, Edit, Mail, Shield, Users } from 'lucide-react';

const API_BASE = '/api';

export default function ClientDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('id');

  const [client, setClient] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Edit plan dialog state
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [planData, setPlanData] = useState({ maxSeats: 0 });
  
  // Invite admin dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState('new'); // 'new' or 'existing'
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    existingUserId: ''
  });

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  const loadClientData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load client details
      const clientRes = await fetch(`${API_BASE}/admin/tenants/${clientId}`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` }
      });
      if (!clientRes.ok) throw new Error('Failed to load client');
      const clientData = await clientRes.json();
      setClient(clientData);
      setPlanData({ maxSeats: clientData.maxSeats });

      // Load admins (users with ADMIN or CLIENT_ADMIN role)
      const usersRes = await fetch(`${API_BASE}/admin/tenants/${clientId}/users`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` }
      });
      if (!usersRes.ok) throw new Error('Failed to load users');
      const usersData = await usersRes.json();
      
      // Map tenantRole to role for frontend compatibility
      const mappedUsers = usersData.map(u => ({ ...u, role: u.tenantRole || u.role }));
      
      setAdmins(mappedUsers.filter(u => u.role === 'ADMIN' || u.role === 'CLIENT_ADMIN'));
      setUsers(mappedUsers);
    } catch (e) {
      setError(e.message || 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const updatePlan = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/tenants/${clientId}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify(planData)
      });
      if (!res.ok) throw new Error('Failed to update plan');
      
      setEditPlanOpen(false);
      await loadClientData();
    } catch (e) {
      setError(e.message || 'Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  const inviteAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      if (inviteMode === 'existing') {
        // Promote existing user to admin
        const res = await fetch(`${API_BASE}/admin/tenants/${clientId}/users/${inviteData.existingUserId}/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Auth.getToken()}`
          },
          body: JSON.stringify({ role: 'CLIENT_ADMIN' })
        });
        if (!res.ok) throw new Error('Failed to promote user');
      } else {
        // Invite new admin
        const res = await fetch(`${API_BASE}/admin/tenants/${clientId}/invite-admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Auth.getToken()}`
          },
          body: JSON.stringify(inviteData)
        });
        if (!res.ok) throw new Error('Failed to invite admin');
      }
      
      setInviteOpen(false);
      setInviteData({ email: '', firstName: '', lastName: '', existingUserId: '' });
      await loadClientData();
    } catch (e) {
      setError(e.message || 'Failed to invite admin');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (!clientId) {
    return (
      <div className="p-6">
        <p className="text-red-600">No client ID provided</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/AdminClients')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold">{client?.name || 'Loading...'}</h2>
            <p className="text-sm text-slate-500">Client ID: {clientId}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Account Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Summary</CardTitle>
              <CardDescription>Subscription and usage details</CardDescription>
            </div>
            <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Plan & Seats</DialogTitle>
                  <DialogDescription>
                    Update the client's subscription plan and seat allocation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxSeats">Maximum Seats</Label>
                    <Input
                      id="maxSeats"
                      type="number"
                      min="1"
                      value={planData.maxSeats}
                      onChange={(e) => setPlanData({ ...planData, maxSeats: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditPlanOpen(false)}>Cancel</Button>
                  <Button onClick={updatePlan} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-sm text-slate-500">Client Name</Label>
              <p className="text-lg font-semibold">{client?.name}</p>
            </div>
            <div>
              <Label className="text-sm text-slate-500">Plan</Label>
              <p className="text-lg font-semibold">Standard</p>
            </div>
            <div>
              <Label className="text-sm text-slate-500">Seats</Label>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">
                  {client?.usedSeats || 0} / {client?.maxSeats || 0} used
                </p>
                <Badge variant={client?.usedSeats >= client?.maxSeats ? "destructive" : "default"}>
                  {client?.maxSeats - client?.usedSeats || 0} available
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admins Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Client Admins</CardTitle>
              <CardDescription>Users with administrative privileges for this client</CardDescription>
            </div>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign / Invite Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Assign or Invite Admin</DialogTitle>
                  <DialogDescription>
                    Promote an existing user or invite a new admin for this client
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <Select value={inviteMode} onValueChange={setInviteMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Invite New Admin</SelectItem>
                        <SelectItem value="existing">Promote Existing User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {inviteMode === 'existing' ? (
                    <div className="space-y-2">
                      <Label htmlFor="existingUser">Select User</Label>
                      <Select
                        value={inviteData.existingUserId}
                        onValueChange={(value) => setInviteData({ ...inviteData, existingUserId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter(u => u.role !== 'ADMIN' && u.role !== 'CLIENT_ADMIN').map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="inviteEmail">Email</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          placeholder="admin@example.com"
                          value={inviteData.email}
                          onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="inviteFirstName">First Name</Label>
                          <Input
                            id="inviteFirstName"
                            placeholder="John"
                            value={inviteData.firstName}
                            onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inviteLastName">Last Name</Label>
                          <Input
                            id="inviteLastName"
                            placeholder="Doe"
                            value={inviteData.lastName}
                            onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button onClick={inviteAdmin} disabled={loading}>
                    {loading ? 'Processing...' : inviteMode === 'existing' ? 'Promote to Admin' : 'Send Invite'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No admins assigned yet</p>
              <p className="text-sm">Click "Assign / Invite Admin" to add one</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map(admin => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.isActive ? "default" : "secondary"}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(admin.lastLoginAt)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Users Preview */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Read-only preview of all users in this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No users yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role.includes('ADMIN') ? "outline" : "secondary"}>
                        {user.role === 'CLIENT_ADMIN' ? 'Admin' : user.role === 'ADMIN' ? 'Admin' : 'Member'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(user.lastLoginAt)}
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

