import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Play, 
  FileText, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Clock,
  TrendingUp,
  BarChart3,
  Plus,
  ArrowRight
} from 'lucide-react';
import MetricCard from '@/components/reports/MetricCard';
import NoProjectWarning from '@/components/NoProjectWarning';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { Auth } from '@/api/auth.js';
import SuperAdminDashboard from './admin/SuperAdminDashboard';
import moment from 'moment';
import { motion } from 'framer-motion';

export default function Dashboard() {
  // Check if user is super admin
  const userRole = Auth.getRole();
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'VENDOR_ADMIN';

  // If super admin, show super admin dashboard instead
  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  const selectedProjectId = useSelectedProject();

  const { data: tests = [], isLoading: testsLoading } = useQuery({
    queryKey: ['tests', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const all = await base44.entities.Test.list('-created_date', 100);
      return all.filter(test => test.projectId === selectedProjectId);
    },
    enabled: !!selectedProjectId
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['modules', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const all = await base44.entities.Module.list('-created_date', 100);
      return all.filter(module => module.projectId === selectedProjectId);
    },
    enabled: !!selectedProjectId
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['runs', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const all = await base44.entities.TestRun.list('-started_at', 100);
      return all.filter(run => run.projectId === selectedProjectId);
    },
    enabled: !!selectedProjectId
  });

  const isLoading = testsLoading || modulesLoading || runsLoading;

  const passedRuns = runs.filter(r => r.status === 'passed').length;
  const failedRuns = runs.filter(r => r.status === 'failed').length;
  const passRate = runs.length > 0 ? Math.round((passedRuns / runs.length) * 100) : 0;

  const recentRuns = runs.slice(0, 5);

  const statusColors = {
    passed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-rose-100 text-rose-700',
    running: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-slate-100 text-slate-600'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">
              {selectedProjectId ? 'Overview of your test automation' : 'Select a project to view dashboard'}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl('TestEditor')}>
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700" disabled={!selectedProjectId}>
                <Plus className="h-4 w-4" />
                New Test
              </Button>
            </Link>
            <Link to={createPageUrl('ModuleEditor')}>
              <Button variant="outline" className="gap-2" disabled={!selectedProjectId}>
                <Package className="h-4 w-4" />
                New Module
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Project Selection Warning */}
        {!selectedProjectId && <NoProjectWarning />}

        {/* Metrics - Only show when project is selected */}
        {selectedProjectId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Tests"
              value={tests.length}
              icon={FileText}
              color="indigo"
            />
            <MetricCard
              title="Total Runs"
              value={runs.length}
              icon={Play}
              color="violet"
            />
            <MetricCard
              title="Pass Rate"
              value={`${passRate}%`}
              subtitle={`${passedRuns} passed, ${failedRuns} failed`}
              icon={TrendingUp}
              color="emerald"
            />
            <MetricCard
              title="Modules"
              value={modules.length}
              icon={Package}
              color="amber"
            />
          </div>
        )}

        {/* Main Content - Only show when project is selected */}
        {selectedProjectId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Runs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Runs</CardTitle>
                <Link to={createPageUrl('Reports')}>
                  <Button variant="ghost" size="sm" className="gap-1 text-indigo-600">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentRuns.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Play className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No test runs yet</p>
                    <p className="text-sm mt-1">Run your first test to see results here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentRuns.map(run => (
                      <Link 
                        key={run.id} 
                        to={createPageUrl(`TestResults?runId=${run.id}`)}
                        className="block"
                      >
                        <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                          <div className={`p-2 rounded-lg ${
                            run.status === 'passed' ? 'bg-emerald-100' : 
                            run.status === 'failed' ? 'bg-rose-100' : 'bg-amber-100'
                          }`}>
                            {run.status === 'passed' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : run.status === 'failed' ? (
                              <XCircle className="h-4 w-4 text-rose-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">{run.test_name}</p>
                            <p className="text-xs text-slate-500">{moment(run.started_at).fromNow()}</p>
                          </div>
                          <Badge variant="outline" className={statusColors[run.status]}>
                            {run.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Test Health</CardTitle>
              </CardHeader>
              <CardContent>
                {tests.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No tests created yet</p>
                    <Link to={createPageUrl('TestEditor')}>
                      <Button variant="link" className="mt-2">Create your first test</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tests.slice(0, 5).map(test => {
                      const testRuns = runs.filter(r => r.test_id === test.id);
                      const testPassed = testRuns.filter(r => r.status === 'passed').length;
                      const testPassRate = testRuns.length > 0 ? Math.round((testPassed / testRuns.length) * 100) : null;
                      
                      return (
                        <Link 
                          key={test.id}
                          to={createPageUrl(`TestHistory?testId=${test.id}`)}
                          className="block"
                        >
                          <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 truncate">{test.name}</p>
                              <p className="text-xs text-slate-500">{testRuns.length} runs</p>
                            </div>
                            {testPassRate !== null && (
                              <div className="text-right">
                                <p className={`text-lg font-bold ${
                                  testPassRate >= 80 ? 'text-emerald-600' : 
                                  testPassRate >= 50 ? 'text-amber-600' : 'text-rose-600'
                                }`}>
                                  {testPassRate}%
                                </p>
                                <p className="text-xs text-slate-500">pass rate</p>
                              </div>
                            )}
                            {test.last_run_status && (
                              <Badge variant="outline" className={statusColors[test.last_run_status]}>
                                {test.last_run_status}
                              </Badge>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                    {tests.length > 5 && (
                      <Link to={createPageUrl('Tests')}>
                        <Button variant="ghost" className="w-full text-indigo-600">
                          View all {tests.length} tests
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
        )}
      </div>
    </div>
  );
}