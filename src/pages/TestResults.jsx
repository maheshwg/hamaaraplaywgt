import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
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
  Database,
  Play,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import StepResult from '@/components/results/StepResult';
import moment from 'moment';
import { motion } from 'framer-motion';

export default function TestResults() {
  const urlParams = new URLSearchParams(window.location.search);
  const runId = urlParams.get('runId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: runData, isLoading } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => base44.entities.TestRun.filter({ id: runId }),
    enabled: !!runId,
    refetchInterval: (data) => {
      if (data && data[0]?.status === 'running') return 2000;
      return false;
    }
  });

  const run = runData?.[0];

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.TestRun.delete(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-runs'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['run', runId] });
      setDeleteDialogOpen(false);
      // Navigate back to tests page
      navigate(createPageUrl('Tests'));
    }
  });

  const statusConfig = {
    passed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', text: 'Passed' },
    failed: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-100', text: 'Failed' },
    running: { icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-100', text: 'Running' },
    cancelled: { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-100', text: 'Cancelled' }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h2 className="text-xl font-semibold text-slate-700">Test run not found</h2>
          <Link to={createPageUrl('Tests')}>
            <Button className="mt-4">Back to Tests</Button>
          </Link>
        </div>
      </div>
    );
  }

  const config = statusConfig[run.status] || statusConfig.cancelled;
  const StatusIcon = config.icon;

  const passedSteps = run.step_results?.filter(s => s.status === 'passed').length || 0;
  const totalSteps = run.step_results?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
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
              <h1 className="text-2xl font-bold text-slate-900">{run.test_name}</h1>
              <p className="text-slate-500 text-sm">Test Run Results</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl(`TestHistory?testId=${run.test_id}`)}>
              <Button variant="outline" className="gap-2">
                <Clock className="h-4 w-4" />
                View History
              </Button>
            </Link>
            <Button
              variant="outline"
              className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </motion.div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className={`p-4 rounded-xl ${config.bg}`}>
                  <StatusIcon className={`h-10 w-10 ${config.color} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">{config.text}</h2>
                    <Badge variant="outline" className="text-sm">
                      {passedSteps}/{totalSteps} steps passed
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {moment(run.started_at || run.created_date).format('MMM D, YYYY h:mm A')}
                    </div>
                    {run.duration_ms && (
                      <div className="flex items-center gap-1">
                        <Timer className="h-4 w-4" />
                        {(run.duration_ms / 1000).toFixed(2)}s
                      </div>
                    )}
                    {run.triggered_by && (
                      <div className="flex items-center gap-1">
                        <Play className="h-4 w-4" />
                        {run.triggered_by}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {run.data_row && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Test Data (Row {run.data_row_index + 1})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(run.data_row).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Step Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {run.step_results?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No step results available
                </div>
              ) : (
                run.step_results?.map((step, index) => (
                  <motion.div
                    key={step.step_id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <StepResult step={step} index={index} />
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Test Run?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this test run? This action cannot be undone and will permanently delete all step results and screenshots associated with this run.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-rose-600 hover:bg-rose-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}