import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Calendar,
  Timer,
  Play,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import moment from 'moment';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function TestHistory() {
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get('testId');

  const { data: testData, isLoading: testLoading } = useQuery({
    queryKey: ['test', testId],
    queryFn: () => base44.entities.Test.filter({ id: testId }),
    enabled: !!testId
  });

  const { data: runs = [], isLoading: runsLoading, error } = useQuery({
    queryKey: ['test-runs', testId],
    queryFn: () => base44.entities.TestRun.filter({ test_id: testId }, '-started_at'),
    enabled: !!testId
  });

  const test = testData?.[0];
  const isLoading = testLoading || runsLoading;

  const statusColors = {
    passed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-100 text-rose-700 border-rose-200',
    running: 'bg-amber-100 text-amber-700 border-amber-200',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const statusIcons = {
    passed: CheckCircle2,
    failed: XCircle,
    running: Clock,
    cancelled: Clock
  };

  // Calculate stats
  const passedRuns = runs.filter(r => r.status === 'passed').length;
  const failedRuns = runs.filter(r => r.status === 'failed').length;
  const passRate = runs.length > 0 ? Math.round((passedRuns / runs.length) * 100) : 0;
  const avgDuration = runs.length > 0 
    ? runs.filter(r => r.duration_ms).reduce((acc, r) => acc + r.duration_ms, 0) / runs.filter(r => r.duration_ms).length 
    : 0;

  // Chart data - last 10 runs reversed
  const chartData = runs.slice(0, 10).reverse().map((run, i) => ({
    name: `Run ${i + 1}`,
    passed: run.status === 'passed' ? 1 : 0,
    duration: run.duration_ms ? run.duration_ms / 1000 : 0
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-5xl mx-auto text-center py-16">
          <h2 className="text-xl font-semibold text-slate-700">Test not found</h2>
          <Link to={createPageUrl('Tests')}>
            <Button className="mt-4">Back to Tests</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Tests')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{test.name}</h1>
              <p className="text-slate-500 text-sm">Run History</p>
            </div>
          </div>
          <Link to={createPageUrl(`TestEditor?id=${testId}`)}>
            <Button variant="outline">Edit Test</Button>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Play className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Runs</p>
                  <p className="text-2xl font-bold text-slate-900">{runs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pass Rate</p>
                  <p className="text-2xl font-bold text-slate-900">{passRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Timer className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avg Duration</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {avgDuration > 0 ? `${(avgDuration / 1000).toFixed(1)}s` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chart */}
        {chartData.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-slate-400" />
                  Run Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="duration" 
                        stroke="#6366f1" 
                        fill="#c7d2fe" 
                        strokeWidth={2}
                        name="Duration (s)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Run History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Runs</CardTitle>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Play className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No runs yet</p>
                  <p className="text-sm mt-1">Run this test to see history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {runs.map((run, i) => {
                    const StatusIcon = statusIcons[run.status];
                    const passedSteps = run.step_results?.filter(s => s.status === 'passed').length || 0;
                    const totalSteps = run.step_results?.length || 0;
                    
                    return (
                      <motion.div
                        key={run.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                      >
                        <Link to={createPageUrl(`TestResults?runId=${run.id}`)}>
                          <div className="flex items-center gap-4 p-4 rounded-lg border hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                            <div className={`p-2 rounded-lg ${
                              run.status === 'passed' ? 'bg-emerald-100' : 
                              run.status === 'failed' ? 'bg-rose-100' : 'bg-amber-100'
                            }`}>
                              <StatusIcon className={`h-5 w-5 ${
                                run.status === 'passed' ? 'text-emerald-600' : 
                                run.status === 'failed' ? 'text-rose-600' : 'text-amber-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={statusColors[run.status]}>
                                  {run.status}
                                </Badge>
                                <span className="text-sm text-slate-500">
                                  {passedSteps}/{totalSteps} steps
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {moment(run.started_at).format('MMM D, YYYY h:mm A')}
                                </div>
                                {run.duration_ms && (
                                  <div className="flex items-center gap-1">
                                    <Timer className="h-3 w-3" />
                                    {(run.duration_ms / 1000).toFixed(2)}s
                                  </div>
                                )}
                                {run.data_row && (
                                  <span className="text-indigo-600">Data Row {run.data_row_index + 1}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}