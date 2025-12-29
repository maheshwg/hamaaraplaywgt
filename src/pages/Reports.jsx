import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Play, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Clock,
  BarChart3,
  Calendar,
  Timer,
  FileText,
  Award
} from 'lucide-react';
import MetricCard from '@/components/reports/MetricCard';
import NoProjectWarning from '@/components/NoProjectWarning';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import moment from 'moment';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

export default function Reports() {
  const [timeRange, setTimeRange] = useState('all');
  const selectedProjectId = useSelectedProject();

  const { data: tests = [], isLoading: testsLoading } = useQuery({
    queryKey: ['tests', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const all = await base44.entities.Test.list('-created_date');
      return all.filter(test => test.projectId === selectedProjectId);
    },
    enabled: !!selectedProjectId
  });

  const { data: allRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ['all-runs', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const all = await base44.entities.TestRun.list('-started_at', 500);
      return all.filter(run => run.projectId === selectedProjectId);
    },
    enabled: !!selectedProjectId
  });

  const isLoading = testsLoading || runsLoading;

  const runs = useMemo(() => {
    if (timeRange === 'all') return allRuns;
    const now = moment();
    const cutoff = {
      'today': now.startOf('day'),
      'week': now.subtract(7, 'days'),
      'month': now.subtract(30, 'days')
    }[timeRange];
    return allRuns.filter(r => moment(r.started_at).isAfter(cutoff));
  }, [allRuns, timeRange]);

  // Calculate metrics
  const totalRuns = runs.length;
  const passedRuns = runs.filter(r => r.status === 'passed').length;
  const failedRuns = runs.filter(r => r.status === 'failed').length;
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;
  const avgDuration = runs.length > 0 
    ? runs.filter(r => r.duration_ms).reduce((acc, r) => acc + r.duration_ms, 0) / runs.filter(r => r.duration_ms).length 
    : 0;

  // Most run tests
  const testRunCounts = useMemo(() => {
    const counts = {};
    runs.forEach(run => {
      counts[run.test_id] = counts[run.test_id] || { count: 0, name: run.test_name, test_id: run.test_id };
      counts[run.test_id].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [runs]);

  // Status distribution for pie chart
  const statusDistribution = [
    { name: 'Passed', value: passedRuns, color: '#10b981' },
    { name: 'Failed', value: failedRuns, color: '#f43f5e' },
    { name: 'Running', value: runs.filter(r => r.status === 'running').length, color: '#f59e0b' },
  ].filter(s => s.value > 0);

  // Daily runs for line chart
  const dailyRuns = useMemo(() => {
    const days = {};
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('MMM D');
      days[date] = { date, runs: 0, passed: 0 };
      last7Days.push(date);
    }
    runs.forEach(run => {
      const date = moment(run.started_at).format('MMM D');
      if (days[date]) {
        days[date].runs++;
        if (run.status === 'passed') days[date].passed++;
      }
    });
    return last7Days.map(d => days[d]);
  }, [runs]);

  // Recent runs
  const recentRuns = runs.slice(0, 10);

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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-slate-500 mt-1">
              {selectedProjectId ? 'Insights into your test automation' : 'Select a project to view reports'}
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange} disabled={!selectedProjectId}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Project Selection Warning */}
        {!selectedProjectId && <NoProjectWarning />}

        {/* Key Metrics - Only show when project is selected */}
        {selectedProjectId && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Test Runs"
                value={totalRuns}
                icon={Play}
                color="indigo"
              />
              <MetricCard
                title="Pass Rate"
                value={`${passRate}%`}
                subtitle={`${passedRuns} passed, ${failedRuns} failed`}
                icon={TrendingUp}
                color="emerald"
              />
              <MetricCard
                title="Total Tests"
                value={tests.length}
                icon={FileText}
                color="violet"
              />
              <MetricCard
                title="Avg Duration"
                value={avgDuration > 0 ? `${(avgDuration / 1000).toFixed(1)}s` : 'N/A'}
                icon={Timer}
                color="amber"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Run Trend */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-slate-400" />
                      Daily Run Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyRuns}>
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            labelStyle={{ fontWeight: 600 }}
                          />
                          <Line type="monotone" dataKey="runs" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} name="Total Runs" />
                          <Line type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Passed" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Status Distribution */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statusDistribution.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-slate-400">
                        No run data available
                      </div>
                    ) : (
                      <div className="h-64 flex items-center">
                        <div className="w-1/2">
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={statusDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {statusDistribution.map((entry, index) => (
                                  <Cell key={index} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 space-y-3">
                          {statusDistribution.map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-sm text-slate-600">{item.name}</span>
                              </div>
                              <span className="font-semibold">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Most Run Tests & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Run Tests */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-500" />
                      Most Run Tests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {testRunCounts.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        No test runs yet
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {testRunCounts.map((item, i) => (
                          <Link key={item.test_id} to={createPageUrl(`TestHistory?testId=${item.test_id}`)}>
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                i === 0 ? 'bg-amber-100 text-amber-700' :
                                i === 1 ? 'bg-slate-200 text-slate-600' :
                                i === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 truncate">{item.name}</p>
                              </div>
                              <Badge variant="outline">{item.count} runs</Badge>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-slate-400" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentRuns.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        No recent activity
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentRuns.map(run => (
                          <Link key={run.id} to={createPageUrl(`TestResults?runId=${run.id}`)}>
                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                              {run.status === 'passed' ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : run.status === 'failed' ? (
                                <XCircle className="h-4 w-4 text-rose-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-amber-500" />
                              )}
                              <span className="flex-1 text-sm text-slate-700 truncate">{run.test_name}</span>
                              <span className="text-xs text-slate-400">{moment(run.started_at).fromNow()}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}