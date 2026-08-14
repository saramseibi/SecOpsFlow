import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, MinusCircle } from 'lucide-react';
import { jobDisplayStatus, type JobStatusDisplay } from '@/lib/scanOverview';
import type { ScannerResult } from '@/types';

const CONFIG: Record<
  JobStatusDisplay,
  { className: string; icon: React.ElementType; animated?: boolean }
> = {
  Passed: { className: 'scan-completed', icon: CheckCircle2 },
  Failed: { className: 'scan-failed', icon: XCircle },
  Warning: { className: 'scan-warning', icon: AlertTriangle },
  Skipped: { className: 'scan-skipped', icon: MinusCircle },
  Running: { className: 'scan-running', icon: Loader2, animated: true },
  Cancelled: { className: 'scan-cancelled', icon: MinusCircle },
};

export default function JobStatusBadge({ result }: { result: ScannerResult }) {
  const label = jobDisplayStatus(result);
  const { className, icon: Icon, animated } = CONFIG[label];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-sm ${className}`}
    >
      <Icon size={11} className={animated ? 'animate-spin' : ''} />
      {label}
    </span>
  );
}
