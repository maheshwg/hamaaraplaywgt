import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Plus, 
  Package, 
  MoreVertical,
  Layers,
  Hash
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import NoProjectWarning from '@/components/NoProjectWarning';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { motion, AnimatePresence } from 'framer-motion';

export default function Modules() {
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);
  const selectedProjectId = useSelectedProject();

  const queryClient = useQueryClient();

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['modules', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const all = await base44.entities.Module.list('-created_date');
      return all.filter(module => module.projectId === selectedProjectId);
    },
    enabled: !!selectedProjectId
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Module.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      setDeleteDialogOpen(false);
      setModuleToDelete(null);
    }
  });

  const filteredModules = modules.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (module) => {
    setModuleToDelete(module);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
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
            <h1 className="text-3xl font-bold text-slate-900">Modules</h1>
            <p className="text-slate-500 mt-1">
              {selectedProjectId ? 'Reusable test components' : 'Select a project to view modules'}
            </p>
          </div>
          <Link to={createPageUrl('ModuleEditor')}>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700" disabled={!selectedProjectId}>
              <Plus className="h-4 w-4" />
              New Module
            </Button>
          </Link>
        </div>

        {/* Project Selection Warning */}
        {!selectedProjectId && <NoProjectWarning />}

        {/* Search - Only show when project is selected */}
        {selectedProjectId && (
          <>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search modules..."
                className="pl-10"
              />
            </div>

            {/* Modules Grid */}
            {filteredModules.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <Package className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-700">No modules found</h3>
                <p className="text-slate-500 mt-1">
                  {search ? 'Try a different search' : 'Create reusable modules to use across tests'}
                </p>
                {!search && (
                  <Link to={createPageUrl('ModuleEditor')}>
                    <Button className="mt-4 gap-2 bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="h-4 w-4" />
                      Create Module
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredModules.map((module, i) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-all duration-200 border-slate-200 hover:border-indigo-300">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100">
                            <Package className="h-5 w-5 text-amber-600" />
                          </div>
                          <Link 
                            to={createPageUrl(`ModuleEditor?id=${module.id}`)}
                            className="hover:text-indigo-600 transition-colors"
                          >
                            <CardTitle className="text-base font-semibold">{module.name}</CardTitle>
                          </Link>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl(`ModuleEditor?id=${module.id}`)}>Edit</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(module)}
                              className="text-rose-600 focus:text-rose-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {module.description && (
                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{module.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Layers className="h-3.5 w-3.5" />
                          {module.steps?.length || 0} steps
                        </div>
                        {module.parameters?.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Hash className="h-3.5 w-3.5" />
                            {module.parameters.length} params
                          </div>
                        )}
                        {module.usage_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Used {module.usage_count} times
                          </Badge>
                        )}
                      </div>
                      {module.parameters?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {module.parameters.map(param => (
                            <Badge key={param} variant="secondary" className="text-xs bg-slate-100">
                              {param}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Module</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{moduleToDelete?.name}"? Tests using this module will need to be updated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteMutation.mutate(moduleToDelete?.id)}
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