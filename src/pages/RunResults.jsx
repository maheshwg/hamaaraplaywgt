import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle2, 
  XCircle, 
  Clock,
  Calendar,
  ChevronRight,
  Search,
  Play,
  Layers,
  Trash2
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import NoProjectWarning from '@/components/NoProjectWarning';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import moment from 'moment';
import { motion, AnimatePresence } from 'framer-motion';
import StepResult from '@/components/results/StepResult';

export default function RunResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedBatchId = searchParams.get('batchId');
  const selectedRunId = searchParams.get('runId');
  const selectedProjectId = useSelectedProject();
  
  console.log('RunResults render - batchId:', selectedBatchId, 'runId:', selectedRunId, 'projectId:', selectedProjectId);
  
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [runToDelete, setRunToDelete] = useState(null);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [selectedRunIds, setSelectedRunIds] = useState([]); // runId/batchId values from `batches`
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Debug: Log state changes
  useEffect(() => {
    console.log('Delete dialog state changed:', {
      deleteDialogOpen,
      batchToDelete: batchToDelete?.runName,
      runToDelete
    });
  }, [deleteDialogOpen, batchToDelete, runToDelete]);

  const { data: allRuns = [], isLoading: testRunsLoading } = useQuery({
    queryKey: ['all-runs', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const all = await base44.entities.TestRun.list('-startedAt', 500);
      return all.filter(run => run.projectId === selectedProjectId);
    },
    enabled: !!selectedProjectId,
    refetchInterval: (query) => {
      // Auto-refresh if there are any running tests
      const data = query.state.data || [];
      const hasRunningTests = data.some(run => run.status === 'running');
      return hasRunningTests ? 2000 : false; // Poll every 2 seconds if tests are running
    }
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['runs', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const all = await base44.entities.Run.list();
      return all.filter(run => run.projectId === selectedProjectId);
    },
    enabled: !!selectedProjectId,
    refetchInterval: (query) => {
      // Auto-refresh if there are any running runs
      const data = query.state.data || [];
      const hasRunningRuns = data.some(run => run.status === 'running');
      return hasRunningRuns ? 2000 : false; // Poll every 2 seconds if runs are running
    }
  });

  const isLoading = testRunsLoading || runsLoading;

  const deleteMutation = useMutation({
    mutationFn: async (runId) => {
      await base44.entities.TestRun.delete(runId);
      return runId;
    },
    onSuccess: (deletedRunId) => {
      queryClient.invalidateQueries({ queryKey: ['all-runs'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      setDeleteDialogOpen(false);
      setRunToDelete(null);
      setBatchToDelete(null);
      // If we deleted the currently viewed run, navigate back
      if (deletedRunId && selectedRunId === deletedRunId) {
        if (selectedBatchId) {
          navigate(createPageUrl(`RunResults?batchId=${selectedBatchId}`));
        } else {
          navigate(createPageUrl('RunResults'));
        }
      }
    }
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async ({ runs, runId }) => {
      console.log('deleteBatchMutation called with:', { runs: runs?.length, runId });
      try {
        // Prefer deleting at the "result/run" level:
        // backend will cascade-delete all TestRuns + StepResults for batchId = runId.
        if (runId && !runId.startsWith('legacy-')) {
          console.log('Deleting Run entity (cascades test runs):', runId);
          await base44.entities.Run.delete(runId);
          console.log('Run entity deleted successfully');
        } else {
          // Legacy runs have no Run entity; delete the individual TestRuns.
          console.log('Legacy run group - deleting test runs:', runs.map(r => r.id));
          await Promise.all(runs.map(run => base44.entities.TestRun.delete(run.id)));
          console.log('All legacy test runs deleted successfully');
        }
        return { runs, runId };
      } catch (error) {
        console.error('Error in deleteBatchMutation:', error);
        throw error;
      }
    },
    onSuccess: (deletedData) => {
      console.log('deleteBatchMutation onSuccess:', deletedData);
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['all-runs'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
      setDeleteDialogOpen(false);
      const deletedRunId = deletedData?.runId;
      setBatchToDelete(null);
      // Navigate back to main results page if we're viewing this batch
      if (selectedBatchId && deletedRunId && selectedBatchId === deletedRunId) {
        navigate(createPageUrl('RunResults'));
      }
    },
    onError: (error) => {
      console.error('deleteBatchMutation onError:', error);
      alert(`Failed to delete run: ${error.message}`);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (selectedBatches) => {
      // Delete sequentially to avoid spiky load and to keep logs understandable.
      for (const batch of selectedBatches) {
        await deleteBatchMutation.mutateAsync({ runs: batch.runs, runId: batch.runId });
      }
      return selectedBatches.map(b => b.runId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-runs'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
      setBulkDeleteDialogOpen(false);
      setSelectedRunIds([]);
    },
    onError: (error) => {
      console.error('bulkDeleteMutation onError:', error);
      alert(`Failed to delete selected runs: ${error.message}`);
    }
  });

  const handleDeleteClick = (e, runId) => {
    e.preventDefault();
    e.stopPropagation();
    setRunToDelete(runId);
    setBatchToDelete(null);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBatchClick = (e, batch) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('handleDeleteBatchClick called with batch:', batch);
    // Clear runToDelete first, then set batch and open dialog
    setRunToDelete(null);
    // Use a callback to ensure batch is set before opening dialog
    setBatchToDelete(batch);
    // Force immediate state update by using a function form
    setDeleteDialogOpen(prev => {
      console.log('Setting deleteDialogOpen to true, prev was:', prev);
      return true;
    });
  };

  const confirmDelete = () => {
    console.log('confirmDelete called, batchToDelete:', batchToDelete, 'runToDelete:', runToDelete);
    if (batchToDelete) {
      console.log('Calling deleteBatchMutation with:', {
        runs: batchToDelete.runs?.length,
        runId: batchToDelete.runId
      });
      if (!batchToDelete.runs || batchToDelete.runs.length === 0) {
        console.error('No runs to delete in batchToDelete:', batchToDelete);
        alert('No test runs found to delete');
        return;
      }
      deleteBatchMutation.mutate({ runs: batchToDelete.runs, runId: batchToDelete.runId });
    } else if (runToDelete) {
      console.log('Calling deleteMutation with runId:', runToDelete);
      deleteMutation.mutate(runToDelete);
    } else {
      console.error('Neither batchToDelete nor runToDelete is set');
      alert('Nothing to delete');
    }
  };

  const toggleRunSelected = (runId, checked) => {
    setSelectedRunIds(prev => {
      const has = prev.includes(runId);
      const nextChecked = checked === true;
      if (nextChecked && !has) return [...prev, runId];
      if (!nextChecked && has) return prev.filter(id => id !== runId);
      return prev;
    });
  };

  // Group test runs by runId (batch_id) and enrich with Run entity data
  const batches = useMemo(() => {
    const grouped = {};
    
    // First, group test runs by batch_id (which is now the runId)
    allRuns.forEach(testRun => {
      // Normalize: ensure both batch_id and batchId exist (API client should do this, but double-check)
      if (testRun.batchId && !testRun.batch_id) {
        testRun.batch_id = testRun.batchId;
      }
      if (testRun.batch_id && !testRun.batchId) {
        testRun.batchId = testRun.batch_id;
      }
      
      // Try both batch_id and batchId
      const runId = testRun.batch_id || testRun.batchId;
      if (!runId) {
        // Legacy runs without batch_id - create a single-run batch
        const legacyId = `legacy-${testRun.id}`;
        if (!grouped[legacyId]) {
          grouped[legacyId] = {
            runId: legacyId,
            runName: testRun.test_name, // Use test name as fallback
            runs: [],
            startedAt: testRun.startedAt || testRun.started_at,
            triggered_by: testRun.triggered_by,
            status: testRun.status
          };
        }
        grouped[legacyId].runs.push(testRun);
      } else {
        if (!grouped[runId]) {
          // Find the Run entity for this runId
          const runEntity = runs.find(r => r.id === runId);
          grouped[runId] = {
            runId: runId,
            runName: runEntity?.name || `Run ${runId.slice(0, 8)}`,
            runs: [],
            startedAt: runEntity?.startedAt || runEntity?.started_at || testRun.startedAt || testRun.started_at,
            triggered_by: runEntity?.triggeredBy || runEntity?.triggered_by || testRun.triggered_by,
            status: runEntity?.status || 'running'
          };
        }
        grouped[runId].runs.push(testRun);
      }
    });
    
    const result = Object.values(grouped)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .filter(batch => {
        if (!search) return true;
        return batch.runs.some(r => 
          r.test_name.toLowerCase().includes(search.toLowerCase())
        ) || batch.runName.toLowerCase().includes(search.toLowerCase());
      });
    
    // Debug: log grouping results
    console.log('Grouped batches:', result.map(b => ({
      runId: b.runId,
      runName: b.runName,
      testCount: b.runs.length,
      testNames: b.runs.map(r => r.test_name)
    })));
    
    return result;
  }, [allRuns, runs, search]);

  // Selection helpers (must be defined after `batches`)
  const visibleRunIds = useMemo(() => batches.map(b => b.runId), [batches]);
  const allVisibleSelected =
    visibleRunIds.length > 0 && visibleRunIds.every(id => selectedRunIds.includes(id));
  const someVisibleSelected = visibleRunIds.some(id => selectedRunIds.includes(id));

  const selectedBatch = batches.find(b => b.runId === selectedBatchId);
  const selectedRun = selectedBatch?.runs.find(r => r.id === selectedRunId);

  const statusColors = {
    passed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-100 text-rose-700 border-rose-200',
    running: 'bg-amber-100 text-amber-700 border-amber-200',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const getBatchStatus = (runs) => {
    if (runs.some(r => r.status === 'running')) return 'running';
    if (runs.some(r => r.status === 'failed')) return 'failed';
    if (runs.every(r => r.status === 'passed')) return 'passed';
    return 'cancelled';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  // View: Step Results for a specific test run
  if (selectedRun) {
    const passedSteps = selectedRun.step_results?.filter(s => s.status === 'passed').length || 0;
    const totalSteps = selectedRun.step_results?.length || 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-slate-500"
          >
            <Link to={createPageUrl('RunResults')} className="hover:text-indigo-600">Results</Link>
            <ChevronRight className="h-4 w-4" />
            <Link 
              to={createPageUrl(`RunResults?batchId=${selectedBatchId}`)} 
              className="hover:text-indigo-600"
            >
              {selectedBatch?.runName || selectedBatchId.slice(0, 15)}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-700">{selectedRun.test_name}</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedRun.test_name}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      {moment(selectedRun.startedAt).format('MMM D, YYYY h:mm A')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={statusColors[selectedRun.status]}>
                      {selectedRun.status}
                    </Badge>
                    <span className="text-sm text-slate-500">{passedSteps}/{totalSteps} steps</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={(e) => handleDeleteClick(e, selectedRun.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {selectedRun.data_row && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(selectedRun.data_row).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs bg-slate-50">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedRun.step_results?.map((step, index) => (
                  <motion.div
                    key={step.step_id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <StepResult step={step} index={index} />
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          key={`delete-dialog-${batchToDelete?.runId || runToDelete || 'none'}`}
          open={deleteDialogOpen} 
          onOpenChange={(open) => {
            console.log('AlertDialog onOpenChange:', open, 'batchToDelete:', batchToDelete, 'runToDelete:', runToDelete);
            setDeleteDialogOpen(open);
            if (!open) {
              setBatchToDelete(null);
              setRunToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {batchToDelete ? `Delete Run "${batchToDelete.runName}"?` : 'Delete Test Run?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {batchToDelete 
                  ? `Are you sure you want to delete this run "${batchToDelete.runName}"? This will permanently delete all ${batchToDelete.runs.length} test run(s) in this run, including all step results and screenshots. This action cannot be undone.`
                  : 'Are you sure you want to delete this test run? This action cannot be undone and will permanently delete all step results and screenshots associated with this run.'
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteDialogOpen(false);
                setRunToDelete(null);
                setBatchToDelete(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-rose-600 hover:bg-rose-700"
                disabled={deleteMutation.isPending || deleteBatchMutation.isPending}
              >
                {(deleteMutation.isPending || deleteBatchMutation.isPending) ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // View: Tests in a specific batch/run
  if (selectedBatch) {
    const batchStatus = getBatchStatus(selectedBatch.runs);
    const passedCount = selectedBatch.runs.filter(r => r.status === 'passed').length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-slate-500"
          >
            <Link to={createPageUrl('RunResults')} className="hover:text-indigo-600">Results</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-700">{selectedBatch?.runName || `Run ${selectedBatchId.slice(0, 15)}`}</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Play className="h-5 w-5 text-indigo-600" />
                      {selectedBatch?.runName || `Run: ${selectedBatchId.slice(0, 15)}`}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      {moment(selectedBatch.startedAt).format('MMM D, YYYY h:mm A')} • {selectedBatch.triggered_by || 'manual'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={statusColors[batchStatus]}>
                      {batchStatus}
                    </Badge>
                    <span className="text-sm text-slate-500">
                      {passedCount}/{selectedBatch.runs.length} passed
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteBatchClick(e, selectedBatch);
                      }}
                      disabled={deleteBatchMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Run
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedBatch.runs.map((run, i) => {
                    // Debug: log run data
                    if (i === 0) {
                      console.log('Sample run data:', {
                        id: run.id,
                        test_name: run.test_name,
                        testName: run.testName,
                        allKeys: Object.keys(run).filter(k => k.includes('test') || k.includes('name'))
                      });
                    }
                    return (
                    <motion.div
                      key={run.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="relative group">
                        <Link 
                          to={createPageUrl(`RunResults?batchId=${selectedBatchId}&runId=${run.id}`)}
                          onClick={() => {
                            console.log('Clicked run:', run.id);
                            console.log('Navigation to:', createPageUrl(`RunResults?batchId=${selectedBatchId}&runId=${run.id}`));
                          }}
                        >
                          <div className="flex items-center gap-4 p-4 rounded-lg border hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                            <div className={`p-2 rounded-lg ${
                              run.status === 'passed' ? 'bg-emerald-100' : 
                              run.status === 'failed' ? 'bg-rose-100' : 'bg-amber-100'
                            }`}>
                              {run.status === 'passed' ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              ) : run.status === 'failed' ? (
                                <XCircle className="h-5 w-5 text-rose-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-amber-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800">
                                {run.test_name || run.testName || `Test ${run.id.slice(0, 8)}`}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <span>{run.step_results?.length || run.stepResults?.length || 0} steps</span>
                                {run.duration_ms && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
                                {run.data_row_index !== null && run.data_row_index !== undefined && (
                                  <span>Data Row {run.data_row_index + 1}</span>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className={statusColors[run.status]}>
                              {run.status}
                            </Badge>
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          </div>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-12 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDeleteClick(e, run.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          key={`delete-dialog-${batchToDelete?.runId || runToDelete || 'none'}`}
          open={deleteDialogOpen} 
          onOpenChange={(open) => {
            console.log('AlertDialog onOpenChange:', open, 'batchToDelete:', batchToDelete, 'runToDelete:', runToDelete);
            setDeleteDialogOpen(open);
            if (!open) {
              setBatchToDelete(null);
              setRunToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {batchToDelete ? `Delete Run "${batchToDelete.runName}"?` : 'Delete Test Run?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {batchToDelete 
                  ? `Are you sure you want to delete this run "${batchToDelete.runName}"? This will permanently delete all ${batchToDelete.runs.length} test run(s) in this run, including all step results and screenshots. This action cannot be undone.`
                  : 'Are you sure you want to delete this test run? This action cannot be undone and will permanently delete all step results and screenshots associated with this run.'
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteDialogOpen(false);
                setRunToDelete(null);
                setBatchToDelete(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-rose-600 hover:bg-rose-700"
                disabled={deleteMutation.isPending || deleteBatchMutation.isPending}
              >
                {(deleteMutation.isPending || deleteBatchMutation.isPending) ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // View: All batches/runs list
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Test Results</h1>
            <p className="text-slate-500 mt-1">
              {selectedProjectId ? `${batches.length} test runs` : 'Select a project to view results'}
            </p>
          </div>
        </motion.div>

        {/* Project Selection Warning */}
        {!selectedProjectId && <NoProjectWarning />}

        {selectedProjectId && (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by test name or run ID..."
                  className="pl-10"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 hidden sm:inline">Select</span>
                  <Checkbox
                    checked={allVisibleSelected ? true : (someVisibleSelected ? "indeterminate" : false)}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setSelectedRunIds(isChecked ? visibleRunIds : []);
                    }}
                    aria-label="Select all runs"
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-slate-600">All</span>
                </div>

                {selectedRunIds.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRunIds([])}
                      className="text-slate-600"
                    >
                      Clear ({selectedRunIds.length})
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2 bg-rose-600 hover:bg-rose-700"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                      disabled={bulkDeleteMutation.isPending || deleteBatchMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete selected
                    </Button>
                  </>
                )}
              </div>
            </div>

            {batches.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Layers className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700">No test runs yet</h3>
            <p className="text-slate-500 mt-1">Run some tests to see results here</p>
            <Link to={createPageUrl('Tests')}>
              <Button className="mt-4 gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Play className="h-4 w-4" />
                Go to Tests
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {batches.map((batch, i) => {
                const batchStatus = getBatchStatus(batch.runs);
                const passedCount = batch.runs.filter(r => r.status === 'passed').length;
                
                return (
                  <motion.div
                    key={batch.runId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="group">
                      <Card className="hover:shadow-md hover:border-indigo-300 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Link
                              to={createPageUrl(`RunResults?batchId=${batch.runId}`)}
                              className="flex items-center gap-4 flex-1 min-w-0"
                            >
                              <div className={`p-3 rounded-xl ${
                                batchStatus === 'passed' ? 'bg-emerald-100' : 
                                batchStatus === 'failed' ? 'bg-rose-100' : 'bg-amber-100'
                              }`}>
                                {batchStatus === 'passed' ? (
                                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                ) : batchStatus === 'failed' ? (
                                  <XCircle className="h-6 w-6 text-rose-600" />
                                ) : (
                                  <Clock className="h-6 w-6 text-amber-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-800 truncate" title={batch.runName}>
                                    {batch.runName}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {batch.triggered_by || 'manual'}
                                  </Badge>
                                  {/* Show run ID suffix if there are multiple runs with the same name */}
                                  {batches.filter(b => b.runName === batch.runName).length > 1 && (
                                    <Badge variant="secondary" className="text-xs font-mono">
                                      {batch.runId.slice(0, 8)}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {moment(batch.startedAt).format('MMM D, YYYY h:mm A')}
                                  </div>
                                  <span>{batch.runs.length} test{batch.runs.length > 1 ? 's' : ''}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className={statusColors[batchStatus]}>
                                  {passedCount}/{batch.runs.length} passed
                                </Badge>
                              </div>
                              <ChevronRight className="h-5 w-5 text-slate-400" />
                            </Link>

                            {/* Delete icon (always visible) for this result/run */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              onClick={(e) => handleDeleteBatchClick(e, batch)}
                              disabled={deleteBatchMutation.isPending || deleteMutation.isPending}
                              title="Delete this run (deletes all test runs inside)"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>

                            {/* Bulk select checkbox (towards the right) */}
                            <div
                              className="flex items-center pl-1"
                              onClick={(e) => {
                                // Prevent accidental navigation when clicking checkbox area
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <Checkbox
                                checked={selectedRunIds.includes(batch.runId)}
                                onCheckedChange={(checked) => toggleRunSelected(batch.runId, checked)}
                                aria-label={`Select run ${batch.runName}`}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        key={`delete-dialog-${batchToDelete?.runId || runToDelete || 'none'}`}
        open={deleteDialogOpen} 
        onOpenChange={(open) => {
          console.log('AlertDialog onOpenChange:', open, 'batchToDelete:', batchToDelete, 'runToDelete:', runToDelete);
          setDeleteDialogOpen(open);
          if (!open) {
            // Clear state when dialog closes
            setBatchToDelete(null);
            setRunToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {batchToDelete ? `Delete Run "${batchToDelete.runName}"?` : 'Delete Test Run?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {batchToDelete 
                ? `Are you sure you want to delete this run "${batchToDelete.runName}"? This will permanently delete all ${batchToDelete.runs.length} test run(s) in this run, including all step results and screenshots. This action cannot be undone.`
                : 'Are you sure you want to delete this test run? This action cannot be undone and will permanently delete all step results and screenshots associated with this run.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setRunToDelete(null);
              setBatchToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700"
              disabled={deleteMutation.isPending || deleteBatchMutation.isPending}
            >
              {(deleteMutation.isPending || deleteBatchMutation.isPending) ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected runs?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedRunIds.length} run(s) and all test runs inside them, including all step results and screenshots. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const selectedBatches = batches.filter(b => selectedRunIds.includes(b.runId));
                if (selectedBatches.length === 0) {
                  setBulkDeleteDialogOpen(false);
                  return;
                }
                bulkDeleteMutation.mutate(selectedBatches);
              }}
              className="bg-rose-600 hover:bg-rose-700"
              disabled={bulkDeleteMutation.isPending || deleteBatchMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}