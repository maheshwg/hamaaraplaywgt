import { Auth } from './auth';

// Backend API base URL
// In development: uses Vite proxy (/api -> localhost:8080)
// In production: uses VITE_API_BASE_URL or defaults to EC2 backend
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    // If VITE_API_BASE_URL is set, ensure it includes /api
    const base = import.meta.env.VITE_API_BASE_URL;
    return base.endsWith('/api') ? base : `${base}/api`;
  }
  return import.meta.env.PROD ? 'http://3.137.217.41:8080/api' : '/api';
};
const API_BASE_URL = getApiBaseUrl();

const authHeaders = () => {
  const token = Auth.getToken();
  if (token) Auth.touch();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Real backend client
export const base44 = {
  auth: {
    signIn: async () => ({ success: true }),
    signOut: async () => ({ success: true }),
    getCurrentUser: async () => null,
  },
  batch: {
    execute: async (testIds, runName, parallel = false) => {
      const response = await fetch(`${API_BASE_URL}/batches/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          testIds,
          runName,
          parallel,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Batch execution failed');
      }
      return response.json();
    },
    getStatus: async (runId) => {
      const response = await fetch(`${API_BASE_URL}/batches/${runId}/status`, { headers: authHeaders() });
      return response.json();
    },
  },
  entities: {
    Test: {
      create: async (data) => {
        const response = await fetch(`${API_BASE_URL}/tests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(data),
        });
        return response.json();
      },
      update: async (id, data) => {
        const response = await fetch(`${API_BASE_URL}/tests/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(data),
        });
        return response.json();
      },
      delete: async (id) => {
        await fetch(`${API_BASE_URL}/tests/${id}`, { method: 'DELETE', headers: authHeaders() });
        return { success: true };
      },
      get: async (id) => {
        const response = await fetch(`${API_BASE_URL}/tests/${id}`, { headers: authHeaders() });
        return response.json();
      },
      filter: async (params) => {
        if (params.id) {
          const response = await fetch(`${API_BASE_URL}/tests/${params.id}`, { headers: authHeaders() });
          const test = await response.json();
          return [test]; // Return as array to match expected format
        }
        const projectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
        const url = projectId ? `${API_BASE_URL}/tests?projectId=${encodeURIComponent(projectId)}` : `${API_BASE_URL}/tests`;
        const response = await fetch(url, { headers: authHeaders() });
        return response.json();
      },
      list: async () => {
        const projectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
        const url = projectId ? `${API_BASE_URL}/tests?projectId=${encodeURIComponent(projectId)}` : `${API_BASE_URL}/tests`;
        const response = await fetch(url, { headers: authHeaders() });
        return response.json();
      },
      find: async () => {
        const projectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
        const url = projectId ? `${API_BASE_URL}/tests?projectId=${encodeURIComponent(projectId)}` : `${API_BASE_URL}/tests`;
        const response = await fetch(url, { headers: authHeaders() });
        return response.json();
      },
    },
    Module: {
      create: async (data) => {
        const response = await fetch(`${API_BASE_URL}/modules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(data),
        });
        return response.json();
      },
      update: async (id, data) => {
        const response = await fetch(`${API_BASE_URL}/modules/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(data),
        });
        return response.json();
      },
      delete: async (id) => {
        await fetch(`${API_BASE_URL}/modules/${id}`, { method: 'DELETE', headers: authHeaders() });
        return { success: true };
      },
      get: async (id) => {
        const response = await fetch(`${API_BASE_URL}/modules/${id}`, { headers: authHeaders() });
        return response.json();
      },
      filter: async (params) => {
        if (params.id) {
          const response = await fetch(`${API_BASE_URL}/modules/${params.id}`, { headers: authHeaders() });
          const module = await response.json();
          return [module]; // Return as array to match expected format
        }
        const response = await fetch(`${API_BASE_URL}/modules`, { headers: authHeaders() });
        return response.json();
      },
      list: async () => {
        const response = await fetch(`${API_BASE_URL}/modules`, { headers: authHeaders() });
        return response.json();
      },
      find: async () => {
        const response = await fetch(`${API_BASE_URL}/modules`, { headers: authHeaders() });
        return response.json();
      },
    },
    TestRun: {
      create: async (data) => ({ id: Date.now().toString(), ...data }),
      update: async (id, data) => ({ id, ...data }),
      delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/tests/runs/${id}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
        if (!response.ok) {
          throw new Error(`Failed to delete test run: ${response.statusText}`);
        }
        return { success: true };
      },
      get: async (id) => {
          const response = await fetch(`${API_BASE_URL}/tests/runs/${id}`, { headers: authHeaders() });
          const run = await response.json();
          // Normalize naming: ensure both camelCase and snake_case variants exist
          if (run) {
            run.step_results = run.step_results || run.stepResults || [];
            run.stepResults = run.stepResults || run.step_results || [];
            // Normalize step results extractedVariables
            if (run.step_results) {
              run.step_results = run.step_results.map(step => {
                step.extracted_variables = step.extracted_variables || step.extractedVariables || {};
                step.extractedVariables = step.extractedVariables || step.extracted_variables || {};
                return step;
              });
            }
            // Normalize batch_id field
            run.batch_id = run.batch_id || run.batchId || null;
            run.batchId = run.batchId || run.batch_id || null;
            // Normalize test_id field
            run.test_id = run.test_id || run.testId || null;
            run.testId = run.testId || run.test_id || null;
            // Normalize test_name field
            run.test_name = run.test_name || run.testName || null;
            run.testName = run.testName || run.test_name || null;
            // Normalize started/completed timestamps
            run.started_at = run.started_at || run.startedAt || null;
            run.startedAt = run.startedAt || run.started_at || null;
            run.completed_at = run.completed_at || run.completedAt || null;
            run.completedAt = run.completedAt || run.completed_at || null;
            // Normalize duration (ms)
            run.duration_ms = run.duration_ms || run.durationMs || run.duration || null;
            run.durationMs = run.durationMs || run.duration_ms || run.duration || null;
          }
          return run;
      },
      list: async (sortOrTestId, limit) => {
        const applySortAndLimit = (arr) => {
          let out = Array.isArray(arr) ? [...arr] : [];

          // Client-side sort: backend endpoint doesn't currently accept a sort param.
          if (sortOrTestId && (sortOrTestId.startsWith('-') || sortOrTestId.startsWith('+'))) {
            const dir = sortOrTestId.startsWith('-') ? -1 : 1; // - means DESC
            const field = sortOrTestId.slice(1);
            const asTime = (v) => {
              if (!v) return 0;
              const t = new Date(v).getTime();
              return Number.isFinite(t) ? t : 0;
            };
            const getField = (r) => {
              if (!r) return null;
              if (field === 'started_at' || field === 'startedAt') return r.startedAt || r.started_at;
              if (field === 'completed_at' || field === 'completedAt') return r.completedAt || r.completed_at;
              if (field === 'created_date' || field === 'createdDate') return r.createdDate || r.created_date;
              return r[field];
            };
            out.sort((a, b) => {
              const av = getField(a);
              const bv = getField(b);
              // Time-ish fields
              if (field.includes('at') || field.toLowerCase().includes('date')) {
                return dir * (asTime(av) - asTime(bv));
              }
              // Fallback string/number compare
              if (typeof av === 'number' && typeof bv === 'number') return dir * (av - bv);
              return dir * String(av ?? '').localeCompare(String(bv ?? ''));
            });
          }

          const n = typeof limit === 'number' ? limit : parseInt(limit, 10);
          if (Number.isFinite(n) && n > 0) {
            out = out.slice(0, n);
          }
          return out;
        };

        const normalizeRun = (r) => {
          if (!r) return r;
          r.step_results = r.step_results || r.stepResults || [];
          r.stepResults = r.stepResults || r.step_results || [];
          // Normalize step results extractedVariables
          if (r.step_results) {
            r.step_results = r.step_results.map(step => {
              step.extracted_variables = step.extracted_variables || step.extractedVariables || {};
              step.extractedVariables = step.extractedVariables || step.extracted_variables || {};
              return step;
            });
          }
          // Normalize batch_id field
          r.batch_id = r.batch_id || r.batchId || null;
          r.batchId = r.batchId || r.batch_id || null;
          // Normalize test_id field
          r.test_id = r.test_id || r.testId || null;
          r.testId = r.testId || r.test_id || null;
          // Normalize test_name field
          r.test_name = r.test_name || r.testName || null;
          r.testName = r.testName || r.test_name || null;
          // Normalize started/completed timestamps
          r.started_at = r.started_at || r.startedAt || null;
          r.startedAt = r.startedAt || r.started_at || null;
          r.completed_at = r.completed_at || r.completedAt || null;
          r.completedAt = r.completedAt || r.completed_at || null;
          // Normalize duration (ms)
          r.duration_ms = r.duration_ms || r.durationMs || r.duration || null;
          r.durationMs = r.durationMs || r.duration_ms || r.duration || null;
          return r;
        };

        // If first param looks like a sort parameter (starts with - or +), fetch all runs
        if (sortOrTestId && (sortOrTestId.startsWith('-') || sortOrTestId.startsWith('+'))) {
          const projectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
          const url = projectId ? `${API_BASE_URL}/tests/runs?projectId=${encodeURIComponent(projectId)}` : `${API_BASE_URL}/tests/runs`;
          const response = await fetch(url, { headers: authHeaders() });
          const runs = await response.json();
          return applySortAndLimit((runs || []).map(normalizeRun));
        }
        // Otherwise treat it as a testId and fetch runs for that specific test
        if (sortOrTestId) {
          const response = await fetch(`${API_BASE_URL}/tests/${sortOrTestId}/runs`, { headers: authHeaders() });
          const runs = await response.json();
          return applySortAndLimit((runs || []).map(normalizeRun));
        }
        // No params - fetch all runs
        const projectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
        const url = projectId ? `${API_BASE_URL}/tests/runs?projectId=${encodeURIComponent(projectId)}` : `${API_BASE_URL}/tests/runs`;
        const response = await fetch(url, { headers: authHeaders() });
        const runs = await response.json();
        return applySortAndLimit((runs || []).map(normalizeRun));
      },
      filter: async (params) => {
        if (params.id) {
          const response = await fetch(`${API_BASE_URL}/tests/runs/${params.id}`, { headers: authHeaders() });
          const run = await response.json();
          if (run) {
            run.step_results = run.step_results || run.stepResults || [];
            run.stepResults = run.stepResults || run.step_results || [];
            // Normalize step results extractedVariables
            if (run.step_results) {
              run.step_results = run.step_results.map(step => {
                step.extracted_variables = step.extracted_variables || step.extractedVariables || {};
                step.extractedVariables = step.extractedVariables || step.extracted_variables || {};
                return step;
              });
            }
            // Normalize batch_id field
            run.batch_id = run.batch_id || run.batchId || null;
            run.batchId = run.batchId || run.batch_id || null;
            // Normalize test_id field
            run.test_id = run.test_id || run.testId || null;
            run.testId = run.testId || run.test_id || null;
            // Normalize test_name field
            run.test_name = run.test_name || run.testName || null;
            run.testName = run.testName || run.test_name || null;
            // Normalize started/completed timestamps
            run.started_at = run.started_at || run.startedAt || null;
            run.startedAt = run.startedAt || run.started_at || null;
            run.completed_at = run.completed_at || run.completedAt || null;
            run.completedAt = run.completedAt || run.completed_at || null;
            // Normalize duration (ms)
            run.duration_ms = run.duration_ms || run.durationMs || run.duration || null;
            run.durationMs = run.durationMs || run.duration_ms || run.duration || null;
          }
          return [run]; // Return as array to match expected format
        }
        const projectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
        const url = projectId ? `${API_BASE_URL}/tests/runs?projectId=${encodeURIComponent(projectId)}` : `${API_BASE_URL}/tests/runs`;
        const response = await fetch(url, { headers: authHeaders() });
        const runs = await response.json();
        return (runs || []).map(r => {
          r.step_results = r.step_results || r.stepResults || [];
          r.stepResults = r.stepResults || r.step_results || [];
          // Normalize step results extractedVariables
          if (r.step_results) {
            r.step_results = r.step_results.map(step => {
              step.extracted_variables = step.extracted_variables || step.extractedVariables || {};
              step.extractedVariables = step.extractedVariables || step.extracted_variables || {};
              return step;
            });
          }
          // Normalize batch_id field
          r.batch_id = r.batch_id || r.batchId || null;
          r.batchId = r.batchId || r.batch_id || null;
          // Normalize test_id field
          r.test_id = r.test_id || r.testId || null;
          r.testId = r.testId || r.test_id || null;
          // Normalize test_name field
          r.test_name = r.test_name || r.testName || null;
          r.testName = r.testName || r.test_name || null;
          // Normalize started/completed timestamps
          r.started_at = r.started_at || r.startedAt || null;
          r.startedAt = r.startedAt || r.started_at || null;
          r.completed_at = r.completed_at || r.completedAt || null;
          r.completedAt = r.completedAt || r.completed_at || null;
          // Normalize duration (ms)
          r.duration_ms = r.duration_ms || r.durationMs || r.duration || null;
          r.durationMs = r.durationMs || r.duration_ms || r.duration || null;
          return r;
        });
      },
      find: async () => {
        const projectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
        const url = projectId ? `${API_BASE_URL}/tests/runs?projectId=${encodeURIComponent(projectId)}` : `${API_BASE_URL}/tests/runs`;
        const response = await fetch(url, { headers: authHeaders() });
        return response.json();
      },
      // Execute a test
      execute: async (testId, options = {}) => {
        const response = await fetch(`${API_BASE_URL}/tests/${testId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            dataRowIndex: options.dataRowIndex || null,
            environment: options.environment || 'development',
            browser: options.browser || 'chromium',
            runId: options.runId || null,
          }),
        });
        return response.json();
      },
    },
    Run: {
      list: async () => {
        const projectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
        const url = projectId ? `${API_BASE_URL}/runs?projectId=${encodeURIComponent(projectId)}` : `${API_BASE_URL}/runs`;
        const response = await fetch(url, { headers: authHeaders() });
        return response.json();
      },
      get: async (id) => {
        const response = await fetch(`${API_BASE_URL}/runs/${id}`, { headers: authHeaders() });
        return response.json();
      },
      delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/runs/${id}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
        if (!response.ok) {
          throw new Error(`Failed to delete run: ${response.statusText}`);
        }
        return { success: true };
      },
    },
  },
  integrations: {
    Core: {
      InvokeLLM: async () => ({ success: true }),
      SendEmail: async () => ({ success: true }),
      UploadFile: async () => ({ success: true }),
      GenerateImage: async () => ({ success: true }),
      ExtractDataFromUploadedFile: async () => ({ success: true }),
      CreateFileSignedUrl: async () => ({ success: true }),
      UploadPrivateFile: async () => ({ success: true }),
    },
  },
};
