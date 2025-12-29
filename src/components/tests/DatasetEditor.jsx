import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Upload } from 'lucide-react';

export default function DatasetEditor({ columns, data, onColumnsChange, onDataChange }) {
  const [newColumnName, setNewColumnName] = useState('');

  const addColumn = (e) => {
    // Prevent form submission if inside a form
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const trimmedName = newColumnName.trim();
    if (!trimmedName) {
      return;
    }
    if (columns.includes(trimmedName)) {
      // Column already exists - could show a message here
      return;
    }
    
    // Add the new column
    const newColumns = [...columns, trimmedName];
    
    // Update all existing rows with the new column (empty value)
    const updatedData = data.map(row => ({ ...row, [trimmedName]: '' }));
    
    // Update both columns and data
    onColumnsChange(newColumns);
    onDataChange(updatedData);
    
    // Clear the input
    setNewColumnName('');
  };

  const removeColumn = (col) => {
    onColumnsChange(columns.filter(c => c !== col));
    onDataChange(data.map(row => {
      const newRow = { ...row };
      delete newRow[col];
      return newRow;
    }));
  };

  const addRow = () => {
    const newRow = {};
    columns.forEach(col => newRow[col] = '');
    onDataChange([...data, newRow]);
  };

  const removeRow = (index) => {
    onDataChange(data.filter((_, i) => i !== index));
  };

  const updateCell = (rowIndex, column, value) => {
    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [column]: value };
    onDataChange(newData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={newColumnName}
          onChange={(e) => setNewColumnName(e.target.value)}
          placeholder="Column name (e.g., username, password)"
          className="max-w-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addColumn(e);
            }
          }}
        />
        <Button 
          onClick={addColumn} 
          type="button"
          variant="outline" 
          size="sm" 
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Column
        </Button>
      </div>

      {columns.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12 text-center">#</TableHead>
                  {columns.map(col => (
                    <TableHead key={col} className="min-w-[150px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{col}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-rose-500"
                          onClick={() => removeColumn(col)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-slate-50">
                    <TableCell className="text-center text-slate-500 font-medium">
                      {rowIndex + 1}
                    </TableCell>
                    {columns.map(col => (
                      <TableCell key={col} className="p-1">
                        <Input
                          value={row[col] || ''}
                          onChange={(e) => updateCell(rowIndex, col, e.target.value)}
                          className="h-8 text-sm border-transparent hover:border-slate-200 focus:border-indigo-300"
                        />
                      </TableCell>
                    ))}
                    <TableCell className="p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-rose-500"
                        onClick={() => removeRow(rowIndex)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-2 border-t bg-slate-50">
            <Button onClick={addRow} variant="ghost" size="sm" className="gap-1 text-slate-600">
              <Plus className="h-4 w-4" />
              Add Data Row
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-slate-400">
          <p>No columns defined yet.</p>
          <p className="text-sm mt-1">Add columns like "username", "email", "password" to create data-driven tests.</p>
        </div>
      )}

      {columns.length > 0 && (
        <p className="text-sm text-slate-500">
          Use <code className="bg-slate-100 px-1 rounded">{'{{columnName}}'}</code> in your test steps to reference data values.
        </p>
      )}
    </div>
  );
}