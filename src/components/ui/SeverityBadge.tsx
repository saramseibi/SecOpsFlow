import React from 'react';
import type { Severity } from '@/types';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
}

const SEVERITY_CONFIG: Record<Severity, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'severity-critical' },
  high: { label: 'High', className: 'severity-high' },
  medium: { label: 'Medium', className: 'severity-medium' },
  low: { label: 'Low', className: 'severity-low' },
  info: { label: 'Info', className: 'severity-info' },
};

export default function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md font-tabular whitespace-nowrap ${config.className} ${
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-[13px] px-2 py-1'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {config.label}
    </span>
  );
}
