import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, MoreVertical, Clock, CheckCircle2, XCircle, Layers, Database, Copy } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import moment from 'moment';

export default function TestCard({ test, selected, onSelect, onRun, onCopy, onDelete }) {
  const statusColors = {
    passed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-100 text-rose-700 border-rose-200',
    running: 'bg-amber-100 text-amber-700 border-amber-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const statusIcons = {
    passed: <CheckCircle2 className="h-3.5 w-3.5" />,
    failed: <XCircle className="h-3.5 w-3.5" />,
    running: <Clock className="h-3.5 w-3.5 animate-spin" />,
    pending: null
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-slate-200 hover:border-indigo-300">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            className="mt-1 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link 
                to={createPageUrl(`TestEditor?id=${test.id}`)}
                className="hover:text-indigo-600 transition-colors"
              >
                <CardTitle className="text-base font-semibold truncate">{test.name}</CardTitle>
              </Link>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRun(test)}
                  className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl(`TestEditor?id=${test.id}`)}>Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl(`TestHistory?testId=${test.id}`)}>View History</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onCopy(test)}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Test
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(test)}
                      className="text-rose-600 focus:text-rose-600"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {test.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{test.description}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {test.last_run_status && (
            <Badge variant="outline" className={`${statusColors[test.last_run_status]} gap-1`}>
              {statusIcons[test.last_run_status]}
              {test.last_run_status}
            </Badge>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Layers className="h-3.5 w-3.5" />
            {test.steps?.length || 0} steps
          </div>
          {test.dataset?.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Database className="h-3.5 w-3.5" />
              {test.dataset.length} data rows
            </div>
          )}
        </div>
        {test.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {test.tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs bg-slate-50">
                {tag}
              </Badge>
            ))}
            {test.tags.length > 4 && (
              <Badge variant="outline" className="text-xs bg-slate-50">
                +{test.tags.length - 4}
              </Badge>
            )}
          </div>
        )}
        {test.last_run_date && (
          <p className="text-xs text-slate-400 mt-2">
            Last run {moment(test.last_run_date).fromNow()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}