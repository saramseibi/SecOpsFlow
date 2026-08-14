import React from 'react';
import type { VulnStatus, ScanStatus } from '@/types';

interface StatusBadgeProps {
  status: VulnStatus | ScanStatus;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'status-open' },
  in_progress: { label: 'In Progress', className: 'status-in-progress' },
  resolved: { label: 'Resolved', className: 'status-resolved' },
  ignored: { label: 'Ignored', className: 'status-ignored' },
  false_positive: { label: 'False Positive', className: 'status-false-positive' },
  running: { label: 'Running', className: 'scan-running' },
  completed: { label: 'Completed', className: 'scan-completed' },
  failed: { label: 'Failed', className: 'scan-failed' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'status-ignored' };
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded-sm ${config.className}`}>
      {config.label}
    </span>
  );
}