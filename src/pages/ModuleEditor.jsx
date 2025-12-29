import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { 
  Save, 
  ArrowLeft, 
  Package,
  Plus,
  X,
  GripVertical,
  Trash2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';

export default function ModuleEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const moduleId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    steps: [],
    parameters: []
  });
  const [newParam, setNewParam] = useState('');

  const { data: module, isLoading } = useQuery({
    queryKey: ['module', moduleId],
    queryFn: () => base44.entities.Module.filter({ id: moduleId }),
    enabled: !!moduleId
  });

  useEffect(() => {
    if (module && module.length > 0) {
      setFormData(module[0]);
    }
  }, [module]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (moduleId) {
        return base44.entities.Module.update(moduleId, data);
      } else {
        return base44.entities.Module.create(data);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      if (!moduleId) {
        navigate(createPageUrl(`ModuleEditor?id=${result.id}`));
      }
    }
  });

  const addStep = () => {
    const newStep = {
      id: `step-${Date.now()}`,
      instruction: '',
      order: formData.steps.length
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
  };

  const updateStep = (id, instruction) => {
    setFormData({
      ...formData,
      steps: formData.steps.map(s => s.id === id ? { ...s, instruction } : s)
    });
  };

  const deleteStep = (id) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i }))
    });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(formData.steps);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setFormData({
      ...formData,
      steps: items.map((s, i) => ({ ...s, order: i }))
    });
  };

  const addParameter = () => {
    if (!newParam.trim()) return;
    if (formData.parameters.includes(newParam.trim())) return;
    setFormData({
      ...formData,
      parameters: [...formData.parameters, newParam.trim()]
    });
    setNewParam('');
  };

  const removeParameter = (param) => {
    setFormData({
      ...formData,
      parameters: formData.parameters.filter(p => p !== param)
    });
  };

  const handleSave = () => {
    // Clean frontend-only fields (id) from steps before saving
    const cleanedData = {
      ...formData,
      steps: formData.steps?.map(({ id, ...step }) => step) || []
    };
    saveMutation.mutate(cleanedData);
  };

  if (moduleId && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Modules')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Package className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {moduleId ? 'Edit Module' : 'Create Module'}
                </h1>
                <p className="text-slate-500 text-sm">
                  Build reusable test components
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending || !formData.name}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Module'}
          </Button>
        </motion.div>

        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Module Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Login Flow, Add to Cart"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this module do?"
                  className="h-20 resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Parameters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parameters</CardTitle>
              <p className="text-sm text-slate-500">
                Define input parameters for this module. Use {`{{paramName}}`} in steps.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newParam}
                  onChange={(e) => setNewParam(e.target.value)}
                  placeholder="Parameter name (e.g., username)"
                  onKeyDown={(e) => e.key === 'Enter' && addParameter()}
                />
                <Button onClick={addParameter} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.parameters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.parameters.map(param => (
                    <Badge 
                      key={param} 
                      variant="secondary" 
                      className="bg-amber-100 text-amber-700 gap-1 pr-1"
                    >
                      {`{{${param}}}`}
                      <button
                        onClick={() => removeParameter(param)}
                        className="hover:bg-amber-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Module Steps</CardTitle>
              <p className="text-sm text-slate-500">
                Define the steps that make up this module.
              </p>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="module-steps">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-2 min-h-[100px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-amber-50' : ''
                      }`}
                    >
                      {formData.steps.length === 0 && (
                        <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">
                          No steps yet. Add your first step below.
                        </div>
                      )}
                      {formData.steps.map((step, index) => (
                        <Draggable key={step.id} draggableId={step.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                            >
                              <div className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:border-amber-300">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                                >
                                  <GripVertical className="h-5 w-5" />
                                </div>
                                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium text-sm">
                                  {index + 1}
                                </div>
                                <Textarea
                                  value={step.instruction}
                                  onChange={(e) => updateStep(step.id, e.target.value)}
                                  placeholder="Step instruction..."
                                  className="flex-1 min-h-[40px] h-[40px] resize-none text-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteStep(step.id)}
                                  className="text-slate-400 hover:text-rose-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <Button onClick={addStep} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add Step
              </Button>

              {formData.parameters.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-700 font-medium mb-2">Available Parameters:</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.parameters.map(param => (
                      <Badge key={param} variant="outline" className="text-xs bg-white">
                        {`{{${param}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}