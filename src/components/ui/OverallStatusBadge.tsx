import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, MinusCircle, Clock } from 'lucide-react';
import { OVERALL_STATUS_LABEL, type OverallStatus } from '@/lib/scanOverview';

const CONFIG: Record<
  OverallStatus,
  { className: string; icon: React.ElementType; animated?: boolean }
> = {
  passed: { className: 'scan-completed', icon: CheckCircle2 },
  completed_with_issues: { className: 'scan-warning', icon: AlertTriangle },
  failed: { className: 'scan-failed', icon: XCircle },
  running: { className: 'scan-running', icon: Loader2, animated: true },
  cancelled: { className: 'scan-cancelled', icon: MinusCircle },
  artifact_pending: { className: 'scan-warning', icon: Clock },
};

export default function OverallStatusBadge({
  status,
  size = 'md',
}: {
  status: OverallStatus;
  size?: 'sm' | 'md';
}) {
  const { className, icon: Icon, animated } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md ${className} ${
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      <Icon size={size === 'sm' ? 11 : 13} className={animated ? 'animate-spin' : ''} />
      {OVERALL_STATUS_LABEL[status]}
    </span>
  );
}
