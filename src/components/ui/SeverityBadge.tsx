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
      className={`inline-flex items-center font-semibold rounded-sm font-tabular ${config.className} ${
        size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
      }`}
    >
      {config.label}
    </span>
  );
}