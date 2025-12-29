import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Auth } from '@/api/auth';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Plus, 
  Play, 
  Tag, 
  Filter,
  X,
  CheckSquare,
  Square,
  Settings2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import TestCard from '@/components/tests/TestCard';
import NoProjectWarning from '@/components/NoProjectWarning';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { motion, AnimatePresence } from 'framer-motion';

export default function Tests() {
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTests, setSelectedTests] = useState([]);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);
  const [testsToRun, setTestsToRun] = useState([]);
  const [runName, setRunName] = useState('');
  const [runError, setRunError] = useState(null);
  const selectedProjectId = useSelectedProject();

  const queryClient = useQueryClient();

  // Clear selection when project changes
  useEffect(() => {
    setSelectedTests([]);
  }, [selectedProjectId]);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['tests', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) {
        return []; // Return empty array if no project selected
      }
      // Fetch tests filtered by project
      const allTests = await base44.entities.Test.list('-created_date');
      return allTests.filter(test => test.projectId === selectedProjectId);
    },
    enabled: !!selectedProjectId // Only fetch if project is selected
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Test.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    }
  });

  const copyMutation = useMutation({
    mutationFn: async (testId) => {
      const token = Auth.getToken();
      const response = await fetch(`http://localhost:8080/api/tests/${testId}/copy`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to copy test');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    }
  });

  const runMutation = useMutation({
    mutationFn: async ({ tests, runName }) => {
      console.log('Running tests:', tests, 'with run name:', runName);
      setRunError(null);
      
      if (!tests || tests.length === 0) {
        throw new Error('No tests selected to run');
      }
      
      // If multiple tests, use batch execution
      if (tests.length > 1) {
        if (!runName || !runName.trim()) {
          throw new Error('Run name is required for multiple tests');
        }
        
        const testIds = tests.map(t => t.id);
        console.log('Executing batch with testIds:', testIds, 'runName:', runName);
        const result = await base44.batch.execute(testIds, runName, false);
        console.log('Batch execution result:', result);
        
        // Update test metadata for all tests
        for (const test of tests) {
          try {
            await base44.entities.Test.update(test.id, {
              run_count: (test.run_count || 0) + 1,
              last_run_date: new Date().toISOString(),
              last_run_status: 'running'
            });
          } catch (e) {
            console.warn('Failed to update test metadata for', test.id, e);
          }
        }
        
        return { runId: result.runId, results: [] };
      } else {
        // Single test execution - create a Run first, then execute
        const test = tests[0];
        const dataRows = test.datasets?.length > 0 ? test.datasets : [null];
        const results = [];
        
        // For single test, use test name as run name
        const finalRunName = runName || test.name;
        
        // Create a Run entity first (we'll need to do this via batch endpoint with single test)
        // Actually, for single test, we can just use the execute endpoint with runId
        // But we need to create the Run first. Let's use batch endpoint for consistency
        if (dataRows.length > 1) {
          // Multiple data rows - use batch endpoint
          const result = await base44.batch.execute([test.id], finalRunName, false);
          await base44.entities.Test.update(test.id, {
            run_count: (test.run_count || 0) + dataRows.length,
            last_run_date: new Date().toISOString(),
            last_run_status: 'running'
          });
          return { runId: result.runId, results: [] };
        } else {
          // Single test, single data row - create Run and execute
          // For now, use batch endpoint for consistency
          const result = await base44.batch.execute([test.id], finalRunName, false);
          await base44.entities.Test.update(test.id, {
            run_count: (test.run_count || 0) + 1,
            last_run_date: new Date().toISOString(),
            last_run_status: 'running'
          });
          return { runId: result.runId, results: [] };
        }
      }
    },
    onSuccess: (data) => {
      console.log('Run mutation successful:', data);
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['all-runs'] });
      setRunDialogOpen(false);
      setTestsToRun([]);
      setSelectedTests([]);
      setRunName('');
      setRunError(null);
    },
    onError: (error) => {
      console.error('Run mutation error:', error);
      setRunError(error.message || 'Failed to run tests. Please try again.');
    }
  });

  const allTags = useMemo(() => {
    const tags = new Set();
    tests.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [tests]);

  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      const matchesSearch = !search || 
        test.name.toLowerCase().includes(search.toLowerCase()) ||
        test.description?.toLowerCase().includes(search.toLowerCase());
      
      const matchesTag = !tagFilter || test.tags?.includes(tagFilter);
      
      const matchesStatus = statusFilter === 'all' || test.last_run_status === statusFilter;
      
      return matchesSearch && matchesTag && matchesStatus;
    });
  }, [tests, search, tagFilter, statusFilter]);

  const handleSelectTest = (testId, selected) => {
    if (selected) {
      setSelectedTests([...selectedTests, testId]);
    } else {
      setSelectedTests(selectedTests.filter(id => id !== testId));
    }
  };

  const handleSelectAll = () => {
    if (selectedTests.length === filteredTests.length) {
      setSelectedTests([]);
    } else {
      setSelectedTests(filteredTests.map(t => t.id));
    }
  };

  const handleRunTest = (test) => {
    setTestsToRun([test]);
    setRunName(test.name); // Default to test name for single test
    setRunDialogOpen(true);
  };

  const handleRunSelected = () => {
    console.log('handleRunSelected called');
    console.log('selectedTests:', selectedTests);
    console.log('tests array length:', tests.length);
    
    if (selectedTests.length === 0) {
      setRunError('Please select at least one test to run');
      setRunDialogOpen(true);
      return;
    }
    
    const testsToRunNow = tests.filter(t => selectedTests.includes(t.id));
    console.log('testsToRunNow:', testsToRunNow);
    
    if (testsToRunNow.length === 0) {
      setRunError('Selected tests not found. Please refresh and try again.');
      setRunDialogOpen(true);
      return;
    }
    
    setTestsToRun(testsToRunNow);
    setRunName(''); // Clear run name for multiple tests - user must provide
    setRunError(null);
    setRunDialogOpen(true);
    console.log('Dialog should now be open, runDialogOpen state will be:', true);
  };

  const handleDelete = (test) => {
    setTestToDelete(test);
    setDeleteDialogOpen(true);
  };

  const handleCopy = (test) => {
    copyMutation.mutate(test.id);
  };

  const confirmDelete = () => {
    if (testToDelete) {
      deleteMutation.mutate(testToDelete.id);
    }
  };

  const confirmRun = () => {
    if (testsToRun.length > 1 && !runName.trim()) {
      // Don't allow running multiple tests without a name
      return;
    }
    const finalRunName = testsToRun.length === 1 ? (runName || testsToRun[0].name) : runName;
    console.log('confirmRun called with:', { 
      testsCount: testsToRun.length, 
      runName: finalRunName,
      testIds: testsToRun.map(t => t.id)
    });
    runMutation.mutate({ tests: testsToRun, runName: finalRunName });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tests</h1>
            <p className="text-slate-500 mt-1">
              {selectedProjectId ? `${tests.length} tests in this project` : 'Select a project to view tests'}
            </p>
          </div>
          <Link to={createPageUrl('TestEditor')}>
            <Button 
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              disabled={!selectedProjectId}
            >
              <Plus className="h-4 w-4" />
              New Test
            </Button>
          </Link>
        </div>

        {/* Project Selection Warning */}
        {!selectedProjectId && <NoProjectWarning />}

        {/* Filters - Only show when project is selected */}
        {selectedProjectId && (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tests..."
                className="pl-10"
              />
            </div>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[180px]">
                <Tag className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Bulk Actions - Only show when project is selected */}
        {selectedProjectId && selectedTests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200"
          >
            <span className="text-sm font-medium text-indigo-700">
              {selectedTests.length} test{selectedTests.length > 1 ? 's' : ''} selected
            </span>
            <Button onClick={handleRunSelected} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Play className="h-4 w-4" />
              Run Selected
            </Button>
            <Button 
              onClick={() => setSelectedTests([])} 
              size="sm" 
              variant="ghost"
              className="text-indigo-600"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </motion.div>
        )}

        {/* Select All - Only show when project is selected */}
        {selectedProjectId && filteredTests.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSelectAll}
            className="gap-2 text-slate-600"
          >
            {selectedTests.length === filteredTests.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedTests.length === filteredTests.length ? 'Deselect All' : 'Select All'}
          </Button>
        )}

        {/* Tests Grid */}
        {filteredTests.length === 0 && selectedProjectId ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700">No tests found</h3>
            <p className="text-slate-500 mt-1">
              {search || tagFilter || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Create your first test to get started'}
            </p>
            {!search && !tagFilter && statusFilter === 'all' && (
              <Link to={createPageUrl('TestEditor')}>
                <Button className="mt-4 gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4" />
                  Create Test
                </Button>
              </Link>
            )}
          </div>
        ) : filteredTests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredTests.map((test, i) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <TestCard
                    test={test}
                    selected={selectedTests.includes(test.id)}
                    onSelect={(checked) => handleSelectTest(test.id, checked)}
                    onRun={handleRunTest}
                    onCopy={handleCopy}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : null}

        {/* Run Dialog */}
        <Dialog open={runDialogOpen} onOpenChange={(open) => {
          setRunDialogOpen(open);
          if (!open) {
            setRunError(null);
            setRunName('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Run Tests</DialogTitle>
              <DialogDescription>
                {testsToRun.length === 0 
                  ? 'No tests selected'
                  : testsToRun.length === 1 
                    ? `Run "${testsToRun[0]?.name}"?`
                    : `Run ${testsToRun.length} selected tests?`}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {testsToRun.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">No tests selected. Please select tests and try again.</p>
                </div>
              )}
              {testsToRun.length > 1 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Run Name <span className="text-rose-600">*</span>
                  </label>
                  <Input
                    value={runName}
                    onChange={(e) => {
                      setRunName(e.target.value);
                      setRunError(null);
                    }}
                    placeholder="Enter a name for this run"
                    className="w-full"
                    autoFocus
                  />
                  {!runName.trim() && (
                    <p className="text-xs text-rose-600 mt-1">Run name is required for multiple tests</p>
                  )}
                </div>
              )}
              {runError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-sm text-rose-600">{runError}</p>
                </div>
              )}
              {testsToRun.length === 1 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Run Name (optional)
                  </label>
                  <Input
                    value={runName}
                    onChange={(e) => setRunName(e.target.value)}
                    placeholder={testsToRun[0]?.name}
                    className="w-full"
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Tests to run:</p>
                {testsToRun.map(test => (
                  <div key={test.id} className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-lg">
                    <Badge variant="outline">{test.steps?.length || 0} steps</Badge>
                    <span className="font-medium text-sm">{test.name}</span>
                    {test.datasets?.length > 0 && (
                      <Badge variant="secondary">{test.datasets.length} data rows</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setRunDialogOpen(false);
                setRunName('');
                setRunError(null);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={confirmRun} 
                disabled={runMutation.isPending || (testsToRun.length > 1 && !runName.trim())}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <Play className="h-4 w-4" />
                {runMutation.isPending ? 'Starting...' : 'Run Tests'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Test</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{testToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}