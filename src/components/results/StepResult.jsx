import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, MinusCircle, ChevronDown, ChevronUp, Image as ImageIcon, MessageSquare, Variable } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// Helper function to convert file path to API URL
const getScreenshotUrl = (path) => {
  if (!path) return null;
  
  // If it's already an HTTP URL (S3 or direct), return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // If it's just a filename (e.g., "screenshot-123456.png"), construct direct URL
  if (!path.includes('/') && path.includes('screenshot-')) {
    return `http://localhost:8080/api/screenshots/${path}`;
  }
  
  // Convert local file path to API endpoint with base64 encoded path
  const encodedPath = btoa(path);
  return `http://localhost:8080/api/screenshots/image?path=${encodedPath}`;
};

export default function StepResult({ step, index }) {
  const [expanded, setExpanded] = useState(step.status === 'failed');
  
  // Debug logging
  console.log('StepResult step data:', {
    instruction: step.instruction,
    screenshot_url: step.screenshot_url,
    screenshotUrl: step.screenshotUrl,
    hasScreenshot: !!(step.screenshot_url || step.screenshotUrl)
  });
  
  // Get the screenshot URL, handling both field names
  const screenshotUrl = getScreenshotUrl(step.screenshot_url || step.screenshotUrl);
  console.log('Computed screenshotUrl:', screenshotUrl);

  const statusConfig = {
    passed: { 
      icon: CheckCircle2, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-700'
    },
    failed: { 
      icon: XCircle, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      badge: 'bg-rose-100 text-rose-700'
    },
    skipped: { 
      icon: MinusCircle, 
      color: 'text-slate-400', 
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      badge: 'bg-slate-100 text-slate-600'
    },
    pending: { 
      icon: Clock, 
      color: 'text-amber-500', 
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-700'
    }
  };

  const config = statusConfig[step.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Card className={`transition-all duration-200 border ${config.border} ${expanded ? config.bg : 'bg-white'}`}>
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-xs">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{step.instruction}</p>
        </div>
        <div className="flex items-center gap-2">
          {(step.duration_ms || step.duration) && (
            <span className="text-xs text-slate-500">{step.duration_ms || step.duration}ms</span>
          )}
          <Badge variant="outline" className={config.badge}>
            {step.status}
          </Badge>
          {(step.notes || screenshotUrl || step.error_message || step.errorMessage || (step.extracted_variables && Object.keys(step.extracted_variables).length > 0) || (step.extractedVariables && Object.keys(step.extractedVariables).length > 0)) && (
            <Button variant="ghost" size="icon" className="h-7 w-7">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {expanded && (step.notes || screenshotUrl || step.error_message || step.errorMessage || (step.extracted_variables && Object.keys(step.extracted_variables).length > 0) || (step.extractedVariables && Object.keys(step.extractedVariables).length > 0)) && (
        <div className={`px-4 pb-4 pt-2 border-t ${config.border}`}>
          <div className="ml-[68px] space-y-3">
            {(() => {
              const extractedVars = step.extracted_variables || step.extractedVariables || {};
              const hasVars = extractedVars && typeof extractedVars === 'object' && Object.keys(extractedVars).length > 0;
              return hasVars ? (
                <div className="flex items-start gap-2">
                  <Variable className="h-4 w-4 text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 mb-2">Extracted Variables</p>
                    <div className="space-y-1.5">
                      {Object.entries(extractedVars).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <span className="font-mono font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {key}
                          </span>
                          <span className="text-slate-400">=</span>
                          <span className="text-slate-700 font-mono bg-slate-50 px-2 py-0.5 rounded">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
            {(step.error_message || step.errorMessage) && (
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-rose-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Error</p>
                  <pre className="text-sm text-rose-700 whitespace-pre-wrap font-mono bg-rose-50 p-2 rounded">{step.error_message || step.errorMessage}</pre>
                </div>
              </div>
            )}
            {step.notes && (
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{step.notes}</p>
                </div>
              </div>
            )}
            {screenshotUrl && (
              <div className="flex items-start gap-2">
                <ImageIcon className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Screenshot</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <img 
                        src={screenshotUrl} 
                        alt="Step screenshot"
                        className="rounded-lg border shadow-sm max-w-xs cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <img 
                        src={screenshotUrl} 
                        alt="Step screenshot"
                        className="w-full rounded-lg"
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}