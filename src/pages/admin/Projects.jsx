import { useEffect, useState } from 'react';
import { Auth } from '@/api/auth.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, FolderPlus, Users, UserPlus, Eye, Edit, Folder } from 'lucide-react';

const API_BASE = '/api';

export default function Projects() {
  const isSuperAdmin = Auth.getRole() === 'SUPER_ADMIN';
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const [assignmentData, setAssignmentData] = useState({
    userId: '',
    accessLevel: 'READ'
  });

  const loadProjects = async () => {
    setError('');
    try {
      const res = await fetch(isSuperAdmin ? `${API_BASE}/admin/projects` : `${API_BASE}/client-admin/projects`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` }
      });
      if (!res.ok) throw new Error(`Failed to load projects (${res.status})`);
      const data = await res.json();
      setProjects(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load projects');
    }
  };

  const loadUsers = async () => {
    if (isSuperAdmin) return; // super admin: read-only view
    try {
      const res = await fetch(`${API_BASE}/client-admin/users`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` }
      });
      if (!res.ok) throw new Error(`Failed to load users`);
      const data = await res.json();
      setUsers(data || []);
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  const loadProjectMembers = async (projectId) => {
    if (isSuperAdmin) return;
    try {
      const res = await fetch(`${API_BASE}/client-admin/projects/${projectId}/access`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` }
      });
      if (!res.ok) throw new Error(`Failed to load project members`);
    const data = await res.json();
      setProjectMembers(data || []);
    } catch (e) {
      console.error('Failed to load project members:', e);
    }
  };

  useEffect(() => { 
    loadProjects(); 
    loadUsers();
  }, []);

  const createProject = async () => {
    if (isSuperAdmin) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/client-admin/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Auth.getToken()}` },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to create project (${res.status})`);
      }
      
      setFormData({ name: '', description: '' });
      await loadProjects();
    } catch (e) {
      setError(e.message || 'Failed to create project');
    } finally {
    setLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    if (isSuperAdmin) return;
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    setError('');
    try {
      const res = await fetch(`${API_BASE}/client-admin/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${Auth.getToken()}` }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to delete project`);
      }
      
      await loadProjects();
    } catch (e) {
      setError(e.message || 'Failed to delete project');
    }
  };

  const assignUserToProject = async () => {
    if (isSuperAdmin) return;
    if (!selectedProject || !assignmentData.userId) return;
    
    setError('');
    try {
      const res = await fetch(`${API_BASE}/client-admin/projects/${selectedProject.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Auth.getToken()}` },
        body: JSON.stringify({
          userId: parseInt(assignmentData.userId),
          accessLevel: assignmentData.accessLevel
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to assign user`);
      }
      
      setAssignmentData({ userId: '', accessLevel: 'READ' });
      await loadProjectMembers(selectedProject.id);
    } catch (e) {
      setError(e.message || 'Failed to assign user');
    }
  };

  const removeUserFromProject = async (membershipId) => {
    if (isSuperAdmin) return;
    if (!confirm('Remove this user from the project?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/client-admin/projects/${selectedProject.id}/access/${membershipId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${Auth.getToken()}` }
      });
      
      if (!res.ok) throw new Error('Failed to remove user');
      
      await loadProjectMembers(selectedProject.id);
    } catch (e) {
      setError(e.message || 'Failed to remove user');
    }
  };

  const openProjectMembers = (project) => {
    setSelectedProject(project);
    loadProjectMembers(project.id);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Project Management</h2>
          <p className="text-slate-600 mt-1">
            {isSuperAdmin ? 'Super Admin: view all projects across all clients.' : 'Manage projects and user access'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create Project Card (client admin only) */}
      {!isSuperAdmin && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Create New Project
          </CardTitle>
          <CardDescription>Add a new project to your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Project"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDesc">Description</Label>
              <Input
                id="projectDesc"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Project description"
              />
            </div>
          </div>
          <Button 
            onClick={createProject} 
            disabled={loading || !formData.name}
            className="w-full md:w-auto"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>Manage your organization's projects</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No projects yet. Create your first project above.</p>
          ) : (
            <div className="space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="border rounded-lg px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Folder className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-semibold">{project.name}</div>
                      {project.description && (
                        <div className="text-sm text-slate-600">{project.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openProjectMembers(project)}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Manage Access
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Manage Project Access: {selectedProject?.name}</DialogTitle>
                          <DialogDescription>Assign users to this project and set their access levels</DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          {/* Assign User Form */}
                          <div className="border rounded-lg p-4 bg-slate-50">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <UserPlus className="h-4 w-4" />
                              Assign User
                            </h4>
                <div className="flex gap-2">
                              <Select 
                                value={assignmentData.userId} 
                                onValueChange={(value) => setAssignmentData(prev => ({ ...prev, userId: value }))}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                  {users.map(user => (
                                    <SelectItem key={user.id} value={String(user.id)}>
                                      {user.name} ({user.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <Select 
                                value={assignmentData.accessLevel}
                                onValueChange={(value) => setAssignmentData(prev => ({ ...prev, accessLevel: value }))}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="READ">
                                    <div className="flex items-center gap-2">
                                      <Eye className="h-4 w-4" />
                                      Read
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="WRITE">
                                    <div className="flex items-center gap-2">
                                      <Edit className="h-4 w-4" />
                                      Write
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Button onClick={assignUserToProject} disabled={!assignmentData.userId}>
                                Assign
                              </Button>
                            </div>
                          </div>

                          {/* Current Members */}
                          <div>
                            <h4 className="font-semibold mb-3">Current Members ({projectMembers.length})</h4>
                            {projectMembers.length === 0 ? (
                              <p className="text-sm text-slate-500 py-4 text-center">No users assigned yet</p>
                            ) : (
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {projectMembers.map(member => (
                                  <div
                                    key={member.id}
                                    className="flex items-center justify-between border rounded px-3 py-2"
                                  >
                                    <div>
                                      <div className="font-medium">{member.user.name}</div>
                                      <div className="text-sm text-slate-600">{member.user.email}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        member.accessLevel === 'WRITE' 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {member.accessLevel === 'WRITE' ? (
                                          <span className="flex items-center gap-1">
                                            <Edit className="h-3 w-3" /> Write
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1">
                                            <Eye className="h-3 w-3" /> Read
                                          </span>
                                        )}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeUserFromProject(member.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteProject(project.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
            ))}
            </div>
      )}
        </CardContent>
      </Card>
    </div>
  );
}
