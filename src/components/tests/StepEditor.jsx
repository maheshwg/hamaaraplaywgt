import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Trash2, Plus, Package, Type } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Auth } from '@/api/auth.js';

export default function StepEditor({ steps, onChange, modules = [], dataColumns = [], showMapped = false }) {
  const [newStepType, setNewStepType] = useState('action');
  const isSuperAdmin = Auth.getRole() === 'SUPER_ADMIN';
  const canShowMapped = isSuperAdmin && showMapped;

  // Normalize steps to ensure they have required fields
  const normalizedSteps = steps.map((step, index) => {
    // Detect if this is a module step:
    // Only treat as module step if it explicitly has module_id property defined
    // This prevents accidental conversion when typing "Run module:" in action steps
    const hasModuleIdProperty = 'module_id' in step;
    
    // For legacy detection: only if module_id exists AND instruction starts with "Run module:"
    let moduleId = step.module_id;
    const isLegacyModuleStep = hasModuleIdProperty && !moduleId && 
                               step.instruction && step.instruction.startsWith('Run module:');
    
    if (isLegacyModuleStep) {
      // Try to extract module name and find ID for legacy steps
      const moduleName = step.instruction.replace('Run module:', '').trim();
      const matchedModule = modules.find(m => m.name === moduleName);
      if (matchedModule) {
        moduleId = matchedModule.id;
      }
    }
    
    return {
      ...step,
      id: step.id || `step-${Date.now()}-${index}`,
      module_id: moduleId,
      display_type: hasModuleIdProperty ? 'module' : 'action'
    };
  });

  const addStep = () => {
    const newStep = {
      id: `step-${Date.now()}`,
      instruction: '',
      order: steps.length,
      type: null,
      selector: null,
      value: null,
      optional: null,
      waitAfter: null
    };
    
    // Add module_id only if it's a module step
    if (newStepType === 'module') {
      newStep.module_id = null; // Use null instead of empty string
    }
    
    onChange([...steps, newStep]);
  };

  const updateStep = (id, updates) => {
    // Remove frontend-only fields before saving
    const cleanUpdates = { ...updates };
    delete cleanUpdates.id;
    delete cleanUpdates.display_type;
    
    // Map through the ORIGINAL steps array, not normalizedSteps
    // This prevents adding module_id property to action steps
    onChange(steps.map(s => s.id === id ? { ...s, ...cleanUpdates } : s));
  };

  const deleteStep = (id) => {
    // Use original steps array and clean up frontend-only properties
    const filtered = steps.filter(s => s.id !== id).map((s, i) => {
      const clean = { ...s, order: i };
      delete clean.display_type;
      return clean;
    });
    onChange(filtered);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    // Use original steps array
    const items = Array.from(steps);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    // Clean up and update order
    const reordered_clean = items.map((s, i) => {
      const clean = { ...s, order: i };
      delete clean.display_type;
      return clean;
    });
    onChange(reordered_clean);
  };

  const highlightVariables = (text) => {
    if (!text) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const isValidVar = dataColumns.includes(varName);
      return `{{${varName}}}`;
    });
  };

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="steps">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-2 min-h-[100px] p-2 rounded-lg transition-colors ${
                snapshot.isDraggingOver ? 'bg-indigo-50' : ''
              }`}
            >
              {normalizedSteps.length === 0 && (
                <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">
                  No steps yet. Add your first step below.
                </div>
              )}
              {normalizedSteps.map((step, index) => (
                <Draggable key={step.id} draggableId={step.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                    >
                      <Card className="p-3 bg-white border border-slate-200 hover:border-indigo-300 transition-colors">
                        <div className="flex items-start gap-3">
                          <div
                            {...provided.dragHandleProps}
                            className="mt-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                          >
                            <GripVertical className="h-5 w-5" />
                          </div>
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={step.display_type === 'module' ? 'secondary' : 'outline'} className="text-xs">
                                {step.display_type === 'module' ? <Package className="h-3 w-3 mr-1" /> : <Type className="h-3 w-3 mr-1" />}
                                {step.display_type === 'module' ? 'Module' : 'Action'}
                              </Badge>
                            </div>
                            {step.display_type === 'action' ? (
                              <div className="space-y-1">
                                <Textarea
                                  value={step.instruction || ''}
                                  onChange={(e) => updateStep(step.id, { instruction: e.target.value })}
                                  placeholder="Describe what this step should do in natural language... Use {{variableName}} to reference variables."
                                  className="min-h-[60px] text-sm resize-none font-mono"
                                />
                                {canShowMapped && (
                                  <div className="mt-2 rounded-md border bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700">
                                    <div className="text-slate-500 font-sans text-[11px] mb-1">
                                      Mapped step (computed on Save, read-only)
                                    </div>
                                    <div>action: {step.type || <span className="text-slate-400">—</span>}</div>
                                    <div>selector: {step.selector || <span className="text-slate-400">—</span>}</div>
                                    <div>value: {step.value != null && step.value !== '' ? step.value : <span className="text-slate-400">—</span>}</div>
                                  </div>
                                )}
                                {(() => {
                                  const instruction = step.instruction || '';
                                  const variableMatches = instruction.match(/\{\{(\w+)\}\}/g);
                                  if (variableMatches && variableMatches.length > 0) {
                                    const uniqueVars = [...new Set(variableMatches.map(m => m.replace(/[{}]/g, '')))];
                                    return (
                                      <div className="flex flex-wrap gap-1.5 items-center text-xs">
                                        <span className="text-slate-500">Variables detected:</span>
                                        {uniqueVars.map(varName => (
                                          <Badge
                                            key={varName}
                                            variant="outline"
                                            className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-mono"
                                          >
                                            {`{{${varName}}}`}
                                          </Badge>
                                        ))}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            ) : (
                              <Select
                                value={step.module_id || ''}
                                onValueChange={(val) => {
                                  const mod = modules.find(m => m.id === val);
                                  updateStep(step.id, { 
                                    module_id: val,
                                    instruction: mod ? `Run module: ${mod.name}` : ''
                                  });
                                }}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select a module..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {modules.length === 0 ? (
                                    <div className="px-2 py-1.5 text-sm text-slate-500">No modules available</div>
                                  ) : (
                                    modules.map(mod => (
                                      <SelectItem key={mod.id} value={mod.id}>
                                        {mod.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                            {dataColumns.length > 0 && step.display_type === 'action' && (
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs text-slate-500">Variables:</span>
                                {dataColumns.map(col => (
                                  <Badge
                                    key={col}
                                    variant="outline"
                                    className="text-xs cursor-pointer hover:bg-indigo-50"
                                    onClick={() => updateStep(step.id, { 
                                      instruction: step.instruction + ` {{${col}}}` 
                                    })}
                                  >
                                    {`{{${col}}}`}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteStep(step.id)}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="flex items-center gap-2 pt-2 border-t">
        <Select value={newStepType} onValueChange={setNewStepType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="action">Action Step</SelectItem>
            <SelectItem value="module">Module Step</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={addStep} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Step
        </Button>
      </div>
    </div>
  );
}