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
            // Normalize test_name field
            run.test_name = run.test_name || run.testName || null;
            run.testName = run.testName || run.test_name || null;
          }
          return run;
      },
      list: async (sortOrTestId) => {
        // If first param looks like a sort parameter (starts with - or +), fetch all runs
        if (sortOrTestId && (sortOrTestId.startsWith('-') || sortOrTestId.startsWith('+'))) {
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
            // Normalize test_name field
            r.test_name = r.test_name || r.testName || null;
            r.testName = r.testName || r.test_name || null;
            return r;
          });
        }
        // Otherwise treat it as a testId and fetch runs for that specific test
        if (sortOrTestId) {
          const response = await fetch(`${API_BASE_URL}/tests/${sortOrTestId}/runs`, { headers: authHeaders() });
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
            // Normalize test_name field
            r.test_name = r.test_name || r.testName || null;
            r.testName = r.testName || r.test_name || null;
            return r;
          });
        }
        // No params - fetch all runs
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
          return r;
        });
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
