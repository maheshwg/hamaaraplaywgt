import { useEffect, useState } from 'react';
import { Auth } from '@/api/auth.js';

export default function ProjectSelector() {
  const [projectId, setProjectId] = useState(localStorage.getItem('selectedProjectId') || '');
  const [projects, setProjects] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const tenantId = localStorage.getItem('selectedTenantId') || '';

  useEffect(() => {
    // Get user info from localStorage
    const storedUserId = localStorage.getItem('userId');
    const storedUserRole = localStorage.getItem('userRole');
    setUserId(storedUserId);
    setUserRole(storedUserRole);
  }, []);

  useEffect(() => {
    async function load() {
      // SUPER_ADMIN can load projects without a userId (dev superadmin often uses a synthetic userId).
      if (!userRole) return;
      if (userRole !== 'SUPER_ADMIN' && !userId) return;
      
      try {
        let res;
        Auth.touch();
        // SUPER_ADMIN can see all projects across all tenants
        if (userRole === 'SUPER_ADMIN') {
          res = await fetch(`/api/admin/projects`, {
            headers: { Authorization: `Bearer ${Auth.getToken()}` }
          });
        } else if (userRole === 'CLIENT_ADMIN') {
          // Client admin sees all projects in their tenant
          res = await fetch(`/api/client-admin/projects`, {
            headers: { Authorization: `Bearer ${Auth.getToken()}` }
          });
        } else {
          // Regular users only see projects they have access to
          res = await fetch(`/api/projects/user/${userId}`, { 
            headers: { Authorization: `Bearer ${Auth.getToken()}` } 
          });
        }
        
        if (!res.ok) {
          console.error('Failed to load projects:', res.status);
          return;
        }
        
        const data = await res.json();
        let projectsList = Array.isArray(data) ? data : [];
        const unfiltered = projectsList;

        // For SUPER_ADMIN, optionally filter by selected tenant (if chosen)
        if (userRole === 'SUPER_ADMIN' && tenantId) {
          projectsList = projectsList.filter(p => String(p.tenantId || p.tenant?.id || '') === String(tenantId));
          // If tenantId is stale/invalid and filtering yields nothing, fall back to showing all.
          if (projectsList.length === 0 && unfiltered.length > 0) {
            projectsList = unfiltered;
          }
        }
        setProjects(projectsList);
        
        // If no project is selected but projects are available, select the first one
        const currentProjectId = localStorage.getItem('selectedProjectId');
        if (projectsList.length > 0 && !currentProjectId) {
          const firstProjectId = projectsList[0].id;
          setProjectId(firstProjectId);
          localStorage.setItem('selectedProjectId', firstProjectId);
          // Trigger a custom event to notify other components of project change
          window.dispatchEvent(new CustomEvent('projectChanged', { detail: { projectId: firstProjectId } }));
        }
      } catch (e) {
        console.error('Error loading projects:', e);
      }
    }
    load();
  }, [userId, userRole, tenantId]);

  const onChange = (e) => {
    const id = e.target.value;
    setProjectId(id);
    localStorage.setItem('selectedProjectId', id);
    // Trigger a custom event to notify other components of project change
    window.dispatchEvent(new CustomEvent('projectChanged', { detail: { projectId: id } }));
  };

  return (
    <div className="p-2">
      <label className="text-xs text-slate-600 mr-2">Project:</label>
      <select value={projectId} onChange={onChange} className="border rounded px-2 py-1 text-sm">
        <option value="">Select a project</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>
            {userRole === 'SUPER_ADMIN' ? `${p.tenantName || p.tenant?.name || 'Tenant'} / ${p.name}` : p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
