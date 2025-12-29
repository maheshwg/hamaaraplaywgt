import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from 'lucide-react';

export default function TagInput({ tags, onChange, suggestions = [] }) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const filteredSuggestions = suggestions.filter(
    s => !tags.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-400">
        {tags.map(tag => (
          <Badge
            key={tag}
            variant="secondary"
            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 gap-1 pr-1"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:bg-indigo-300 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={tags.length === 0 ? "Add tags (press Enter or comma)" : ""}
          className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 p-0 h-6"
        />
      </div>
      
      {showSuggestions && filteredSuggestions.length > 0 && inputValue && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-auto">
          {filteredSuggestions.map(suggestion => (
            <button
              key={suggestion}
              onClick={() => addTag(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-indigo-50 text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}