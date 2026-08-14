'use client';

import React from 'react';
import { CheckSquare, XCircle, Eye, X } from 'lucide-react';


interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onMarkResolved: () => void;
  onIgnore: () => void;
  onMarkFalsePositive: () => void;
}

export default function BulkActionBar({
  selectedCount,
  onClear,
  onMarkResolved,
  onIgnore,
  onMarkFalsePositive,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bulk-action-bar fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 bg-card border border-primary/40 rounded-xl shadow-2xl">
      <span className="text-sm font-semibold text-foreground font-tabular">
        {selectedCount} selected
      </span>
      <div className="w-px h-5 bg-border" />
      <button
        onClick={onMarkResolved}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/10 rounded-md transition-colors"
      >
        <CheckSquare size={13} /> Mark Resolved
      </button>
      <button
        onClick={onIgnore}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
      >
        <Eye size={13} /> Ignore
      </button>
      <button
        onClick={onMarkFalsePositive}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
      >
        <XCircle size={13} /> False Positive
      </button>
      <div className="w-px h-5 bg-border" />
      <button
        onClick={onClear}
        className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        aria-label="Clear selection"
      >
        <X size={14} />
      </button>
    </div>
  );
}