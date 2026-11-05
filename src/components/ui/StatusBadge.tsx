import React from 'react';
import { Ban, CheckCircle2, CircleDashed, CircleDot, EyeOff, Loader2, XCircle } from 'lucide-react';
import type { VulnStatus, ScanStatus } from '@/types';

interface StatusBadgeProps {
  status: VulnStatus | ScanStatus;
}

// Each status pairs a color with an icon, so it never relies on color alone.
const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> =
  {
    open: { label: 'Open', className: 'status-open', icon: CircleDot },
    in_progress: { label: 'In Progress', className: 'status-in-progress', icon: CircleDashed },
    resolved: { label: 'Resolved', className: 'status-resolved', icon: CheckCircle2 },
    ignored: { label: 'Ignored', className: 'status-ignored', icon: EyeOff },
    false_positive: { label: 'False Positive', className: 'status-false-positive', icon: Ban },
    running: { label: 'Running', className: 'scan-running', icon: Loader2 },
    completed: { label: 'Completed', className: 'scan-completed', icon: CheckCircle2 },
    failed: { label: 'Failed', className: 'scan-failed', icon: XCircle },
  };

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'status-ignored',
    icon: CircleDot,
  };
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${config.className}`}
    >
      <Icon
        size={12}
        strokeWidth={2.2}
        aria-hidden="true"
        className={status === 'running' ? 'animate-spin' : undefined}
      />
      {config.label}
    </span>
  );
}
