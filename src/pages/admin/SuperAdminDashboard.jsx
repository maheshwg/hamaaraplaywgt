import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@/api/auth.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, ChevronRight, TrendingUp, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE = '/api';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/tenants`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to load clients');
      const data = await res.json();
      setTenants(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalClients: tenants.length,
    totalSeats: tenants.reduce((sum, t) => sum + (t.maxSeats || 0), 0),
    usedSeats: tenants.reduce((sum, t) => sum + (t.usedSeats || 0), 0),
    activeClients: tenants.filter(t => (t.usedSeats || 0) > 0).length,
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h2 className="text-3xl font-bold text-slate-900">Super Admin Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Overview of all clients and subscriptions</p>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </motion.div>
      )}

      {/* Statistics Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={containerVariants}>
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Clients</CardTitle>
              <Building2 className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.totalClients}</div>
              <p className="text-xs text-slate-500 mt-1">Registered organizations</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Clients</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.activeClients}</div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.totalClients > 0 
                  ? `${Math.round((stats.activeClients / stats.totalClients) * 100)}% of total`
                  : 'No clients yet'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Seats</CardTitle>
              <Package className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.totalSeats}</div>
              <p className="text-xs text-slate-500 mt-1">Across all clients</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Seat Usage</CardTitle>
              <Users className="h-5 w-5 text-violet-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {stats.usedSeats} / {stats.totalSeats}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.totalSeats > 0 
                  ? `${Math.round((stats.usedSeats / stats.totalSeats) * 100)}% utilized`
                  : '0% utilized'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Recent Clients */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Clients</CardTitle>
                <CardDescription>Latest client organizations</CardDescription>
              </div>
              <Button onClick={() => navigate('/AdminClients')}>
                View All
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tenants.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
                <p className="text-sm text-slate-500 mb-4">Create your first client to get started</p>
                <Button onClick={() => navigate('/AdminClients')}>
                  Create First Client
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tenants.slice(0, 5).map((tenant, index) => {
                  const seatUsagePercent = (tenant.usedSeats / tenant.maxSeats) * 100;
                  return (
                    <motion.div
                      key={tenant.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/AdminClientDetails?id=${tenant.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50">
                          <Building2 className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{tenant.name}</p>
                          <p className="text-sm text-slate-500">ID: {tenant.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-900">
                            {tenant.usedSeats} / {tenant.maxSeats} seats
                          </p>
                          <p className="text-xs text-slate-500">
                            {tenant.maxSeats - tenant.usedSeats} available
                          </p>
                        </div>
                        <Badge 
                          variant={seatUsagePercent >= 90 ? "destructive" : seatUsagePercent >= 70 ? "default" : "secondary"}
                        >
                          {seatUsagePercent >= 90 ? 'Full' : 'Active'}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </motion.div>
                  );
                })}
                
                {tenants.length > 5 && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => navigate('/AdminClients')}
                  >
                    View {tenants.length - 5} More Clients
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-start gap-2"
                onClick={() => navigate('/AdminClients')}
              >
                <Building2 className="h-5 w-5 text-indigo-600" />
                <div className="text-left">
                  <p className="font-semibold">Manage Clients</p>
                  <p className="text-xs text-slate-500">View and edit client organizations</p>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-start gap-2"
                onClick={() => navigate('/AdminClients')}
              >
                <Users className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <p className="font-semibold">Create Client</p>
                  <p className="text-xs text-slate-500">Add a new client organization</p>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-start gap-2"
                onClick={() => navigate('/AdminClients')}
              >
                <Package className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-semibold">Manage Licenses</p>
                  <p className="text-xs text-slate-500">Adjust seat allocations</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}


