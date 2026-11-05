import React from 'react';
import type { ScanStatus } from '@/types';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface ScanStatusBadgeProps {
  status: ScanStatus;
  animated?: boolean;
}

export default function ScanStatusBadge({ status, animated = true }: ScanStatusBadgeProps) {
  if (status === 'running') {
    return (
      <span className="scan-running inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-sm">
        <Loader2 size={12} aria-hidden="true" className={animated ? 'animate-spin' : ''} />
        Running
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="scan-completed inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-sm">
        <CheckCircle2 size={12} aria-hidden="true" />
        Completed
      </span>
    );
  }
  return (
    <span className="scan-failed inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-sm">
      <XCircle size={12} aria-hidden="true" />
      Failed
    </span>
  );
}
