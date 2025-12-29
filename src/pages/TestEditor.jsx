import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { 
  Save, 
  ArrowLeft, 
  Play, 
  Layers,
  Database,
  Tag,
  Settings2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import StepEditor from '@/components/tests/StepEditor';
import DatasetEditor from '@/components/tests/DatasetEditor';
import TagInput from '@/components/tests/TagInput';
import { motion } from 'framer-motion';
import StepResult from '@/components/results/StepResult';

export default function TestEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [optimisticRun, setOptimisticRun] = useState(null);
  const [expandedRuns, setExpandedRuns] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: [],
    steps: [],
    dataset: [],
    dataset_columns: [],
    status: 'draft',
    appUrl: '',
    appType: 'other'
  });
  
  // Debug: Log formData changes
  useEffect(() => {
    console.log('formData updated:', {
      dataset: formData.dataset,
      dataset_columns: formData.dataset_columns,
      dataset_length: formData.dataset?.length,
      columns_length: formData.dataset_columns?.length
    });
  }, [formData.dataset, formData.dataset_columns]);

  const { data: test, isLoading: testLoading } = useQuery({
    queryKey: ['test', testId],
    queryFn: () => base44.entities.Test.filter({ id: testId }),
    enabled: !!testId
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.Module.list()
  });

  const { data: allTests = [] } = useQuery({
    queryKey: ['allTests'],
    queryFn: () => base44.entities.Test.list()
  });

  const { data: latestRuns, refetch: refetchLatestRun } = useQuery({
    queryKey: ['latest-run', testId],
    queryFn: async () => {
      if (!testId) return [];
      // Fetch runs for this specific testId, then take the latest 5
      const runs = await base44.entities.TestRun.list(testId);
      const sorted = (runs || []).sort((a, b) => {
        const aTime = new Date(a.started_at || a.startedAt || a.created_date || a.createdDate || 0).getTime();
        const bTime = new Date(b.started_at || b.startedAt || b.created_date || b.createdDate || 0).getTime();
        return bTime - aTime;
      });
      return sorted.slice(0, 5);
    },
    enabled: !!testId,
    refetchInterval: (data) => {
      // Poll while optimistic or while server says running
      if (optimisticRun) return 2000;
      const run = data?.[0];
      if (run && run.status === 'running') return 2000;
      return false;
    }
  });
  const runsToShow = useMemo(() => {
    const list = latestRuns || [];
    if (optimisticRun) {
      const exists = list.some(r => r.id === optimisticRun.id);
      return exists ? list.slice(0, 5) : [optimisticRun, ...list].slice(0, 5);
    }
    return list.slice(0, 5);
  }, [latestRuns, optimisticRun]);

  // Clear optimistic once real data arrives for this test
  useEffect(() => {
    if (!optimisticRun || !latestRuns || latestRuns.length === 0) return;
    const optimisticTime = new Date(optimisticRun.started_at || optimisticRun.startedAt || 0).getTime();
    const newerRealRun = latestRuns.find(r => {
      const t = new Date(r.started_at || r.startedAt || 0).getTime();
      return t >= optimisticTime;
    });
    if (newerRealRun) {
      setOptimisticRun(null);
    }
  }, [latestRuns, optimisticRun]);

  const allTags = [...new Set(allTests.flatMap(t => t.tags || []))];

  useEffect(() => {
    if (test && test.length > 0) {
      const testData = test[0];
      // Add IDs to steps if they don't have them
      if (testData.steps && Array.isArray(testData.steps)) {
        testData.steps = testData.steps.map((step, index) => ({
          ...step,
          id: step.id || `step-${Date.now()}-${index}`
        }));
      }
      
      // Convert datasets (backend format) to dataset/dataset_columns (frontend format)
      if (testData.datasets && testData.datasets.length > 0) {
        const firstDataset = testData.datasets[0];
        if (firstDataset.data) {
          try {
            const parsed = JSON.parse(firstDataset.data);
            testData.dataset_columns = parsed.dataset_columns || [];
            testData.dataset = parsed.dataset || [];
          } catch (e) {
            console.warn('Failed to parse dataset data:', e);
            testData.dataset_columns = [];
            testData.dataset = [];
          }
        } else {
          testData.dataset_columns = [];
          testData.dataset = [];
        }
      } else {
        testData.dataset_columns = [];
        testData.dataset = [];
      }
      
      setFormData(testData);
    }
  }, [test]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (testId) {
        return base44.entities.Test.update(testId, data);
      } else {
        return base44.entities.Test.create(data);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      queryClient.invalidateQueries({ queryKey: ['allTests'] });
      if (!testId) {
        navigate(createPageUrl(`TestEditor?id=${result.id}`));
      }
    }
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      // Get the selected project ID from localStorage
      const selectedProjectId = localStorage.getItem('selectedProjectId');
      
      if (!selectedProjectId) {
        throw new Error('No project selected. Please select a project from the dropdown.');
      }
      
      // Transform dataset/dataset_columns to datasets format before saving
      const dataToSave = { 
        ...formData,
        projectId: selectedProjectId // Add projectId to the test
      };
      if (dataToSave.dataset && dataToSave.dataset.length > 0 && dataToSave.dataset_columns && dataToSave.dataset_columns.length > 0) {
        const datasetJson = JSON.stringify({
          dataset_columns: dataToSave.dataset_columns,
          dataset: dataToSave.dataset
        });
        dataToSave.datasets = [{
          name: 'Default Dataset',
          data: datasetJson
        }];
      } else {
        dataToSave.datasets = [];
      }
      delete dataToSave.dataset;
      delete dataToSave.dataset_columns;
      
      // Clean up frontend-only fields from steps
      dataToSave.steps = dataToSave.steps?.map(({ id, display_type, ...step }) => step) || [];
      
      // Ensure the test is saved on the backend first
      let savedTest;
      if (testId) {
        // Update existing test
        await base44.entities.Test.update(testId, dataToSave);
        savedTest = { ...dataToSave, id: testId };
      } else {
        savedTest = await base44.entities.Test.create(dataToSave);
      }
      
      // Use batch execution endpoint for consistency (even for single test)
      // This creates a Run entity with the test name
      const result = await base44.batch.execute([savedTest.id], savedTest.name, false);

      // Update test metadata (run count / last run) on the server
      await base44.entities.Test.update(savedTest.id, {
        run_count: (savedTest.run_count || 0) + 1,
        last_run_date: new Date().toISOString(),
        last_run_status: 'running'
      });

      return savedTest;
    },
    onMutate: () => {
      if (!testId) return;
      const tempId = `temp-${Date.now()}`;
      setOptimisticRun({
        id: tempId,
        status: 'running',
        test_id: testId,
        testId: testId,
        started_at: new Date().toISOString(),
        step_results: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['all-runs'] });
      refetchLatestRun();
    },
    onError: (error) => {
      toast({
        title: "Test execution failed",
        description: error.message || "Failed to execute test. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    // Get the selected project ID from localStorage
    const selectedProjectId = localStorage.getItem('selectedProjectId');
    
    if (!selectedProjectId) {
      toast({
        title: "No project selected",
        description: "Please select a project from the dropdown before saving the test.",
        variant: "destructive",
      });
      return;
    }
    
    // Clean up frontend-only fields from steps before saving
    // Transform dataset/dataset_columns into datasets format expected by backend
    const cleanedData = {
      ...formData,
      projectId: selectedProjectId, // Add projectId to the test
      steps: formData.steps?.map(({ id, display_type, ...step }) => step) || []
    };
    
    console.log('handleSave - formData.dataset:', formData.dataset);
    console.log('handleSave - formData.dataset_columns:', formData.dataset_columns);
    console.log('handleSave - projectId:', selectedProjectId);
    
    // Convert dataset/dataset_columns to datasets format
    if (cleanedData.dataset && cleanedData.dataset.length > 0 && cleanedData.dataset_columns && cleanedData.dataset_columns.length > 0) {
      // Create a single TestDataset with the data as JSON
      const datasetJson = JSON.stringify({
        dataset_columns: cleanedData.dataset_columns,
        dataset: cleanedData.dataset
      });
      cleanedData.datasets = [{
        name: 'Default Dataset',
        data: datasetJson
      }];
      console.log('handleSave - Created datasets:', cleanedData.datasets);
    } else {
      // No dataset data, set empty array
      cleanedData.datasets = [];
      console.log('handleSave - No dataset data. dataset length:', cleanedData.dataset?.length, 'columns length:', cleanedData.dataset_columns?.length);
    }
    
    // Remove frontend-only fields
    delete cleanedData.dataset;
    delete cleanedData.dataset_columns;
    
    console.log('handleSave - Final cleanedData.datasets:', cleanedData.datasets);
    saveMutation.mutate(cleanedData);
  };

  const handleRun = (e) => {
    // Prevent double clicks and multiple calls
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent if already running or mutation is pending
    if (isRunning || runMutation.isPending) {
      return;
    }
    
    // Set running state immediately to prevent duplicate calls
    setIsRunning(true);
    
    // Show notification only once
    toast({
      title: "Test execution started",
      description: `Running test: ${formData.name || 'Untitled Test'}`,
      duration: 5000, // 5 seconds
      className: "bg-blue-50 border-blue-300",
    });
    
    // Run the mutation
    runMutation.mutate(undefined, {
      onSettled: () => {
        // Reset running state after mutation completes (success or error)
        setIsRunning(false);
      }
    });
  };

  if (testId && testLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const selectedProjectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Project Selection Warning */}
        {!selectedProjectId && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <Settings2 className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-amber-900">No Project Selected</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Please select a project from the dropdown in the top navigation bar before creating or editing tests.
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
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
              <h1 className="text-2xl font-bold text-slate-900">
                {testId ? 'Edit Test' : 'Create Test'}
              </h1>
              <p className="text-slate-500 text-sm">
                Write test steps in natural language
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSave}
              disabled={saveMutation.isPending || !formData.name || !selectedProjectId}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button 
              onClick={handleRun}
              disabled={isRunning || runMutation.isPending || !formData.name || formData.steps.length === 0 || !selectedProjectId}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <Play className="h-4 w-4" />
              {(isRunning || runMutation.isPending) ? 'Starting...' : 'Run Test'}
            </Button>
          </div>
        </motion.div>

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Test Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Login with valid credentials"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* App URL and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appUrl">Application URL *</Label>
                  <Input
                    id="appUrl"
                    type="url"
                    value={formData.appUrl || ''}
                    onChange={(e) => setFormData({ ...formData, appUrl: e.target.value })}
                    placeholder="https://www.example.com"
                  />
                  <p className="text-xs text-slate-500">
                    The test will automatically navigate to this URL before running
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appType">Application Type</Label>
                  <Select 
                    value={formData.appType || 'other'} 
                    onValueChange={(val) => setFormData({ ...formData, appType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="other">Other / Generic</SelectItem>
                      <SelectItem value="react-spa">React SPA</SelectItem>
                      <SelectItem value="angular-spa">Angular SPA</SelectItem>
                      <SelectItem value="ecommerce">E-Commerce</SelectItem>
                      <SelectItem value="admin-dashboard">Admin Dashboard</SelectItem>
                      <SelectItem value="form-heavy">Form-Heavy App</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Helps the AI agent understand app-specific patterns
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this test validates..."
                  className="h-20 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput
                  tags={formData.tags || []}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                  suggestions={allTags}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs for Steps and Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="steps" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="steps" className="gap-2">
                <Layers className="h-4 w-4" />
                Test Steps ({formData.steps?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="data" className="gap-2">
                <Database className="h-4 w-4" />
                Test Data ({formData.dataset?.length || 0} rows)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="steps">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Steps</CardTitle>
                  <p className="text-sm text-slate-500">
                    Add steps in natural language. You can also reference reusable modules.
                  </p>
                </CardHeader>
                <CardContent>
                  <StepEditor
                    steps={formData.steps || []}
                    onChange={(steps) => setFormData({ ...formData, steps })}
                    modules={modules}
                    dataColumns={formData.dataset_columns || []}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Data</CardTitle>
                  <p className="text-sm text-slate-500">
                    Define data columns and rows for data-driven testing. Use {`{{columnName}}`} in steps.
                  </p>
                </CardHeader>
                <CardContent>
                  <DatasetEditor
                    columns={formData.dataset_columns || []}
                    data={formData.dataset || []}
                    onColumnsChange={(cols) => setFormData(prev => ({ ...prev, dataset_columns: cols }))}
                    onDataChange={(data) => setFormData(prev => ({ ...prev, dataset: data }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Recent Runs (last 5) */}
        {testId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Runs (last 5)</CardTitle>
                  <p className="text-sm text-slate-500">Most recent executions for this test</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetchLatestRun()} disabled={runMutation.isPending}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!runsToShow?.length && (
                  <div className="text-sm text-slate-500">No runs yet. Click "Run Test" to execute.</div>
                )}
                {runsToShow?.map((run, runIdx) => (
                  <div key={run.id || runIdx} className="border border-slate-200 rounded-lg p-4 space-y-3">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between text-left"
                      onClick={() => setExpandedRuns(prev => ({ ...prev, [run.id]: !prev[run.id] }))}
                    >
                      <div className="flex items-center gap-3">
                        {run.status === 'passed' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                        {run.status === 'failed' && <XCircle className="h-5 w-5 text-rose-600" />}
                        {run.status === 'running' && <RefreshCw className="h-5 w-5 text-amber-600 animate-spin" />}
                        {run.status === 'cancelled' && <Clock className="h-5 w-5 text-slate-500" />}
                        <div className="text-sm text-slate-700 flex flex-col">
                          <span className="font-medium">
                            {run.test_name || run.testName || formData.name || 'Test Run'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {run.started_at ? new Date(run.started_at).toLocaleString() : ''}
                            {run.duration_ms ? ` • ${(run.duration_ms / 1000).toFixed(1)}s` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link to={createPageUrl(`TestResults?runId=${run.id}`)} className="text-indigo-600 text-xs font-medium hover:underline">
                          View details
                        </Link>
                        {expandedRuns[run.id] ? (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        )}
                      </div>
                    </button>
                    {expandedRuns[run.id] && (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        {run.step_results?.length ? (
                          run.step_results.map((step, index) => (
                            <StepResult key={step.step_id || `${run.id}-${index}`} step={step} index={index} />
                          ))
                        ) : (
                          <div className="text-xs text-slate-500">No step results yet.</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

      </div>
    </div>
  );
}