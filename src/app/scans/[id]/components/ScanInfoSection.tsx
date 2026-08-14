'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { formatDateTime, formatDuration, shortSha } from '@/lib/scanOverview';
import type { Scan } from '@/types';

const TRIGGER_LABEL: Record<string, string> = {
  push: 'Push',
  manual: 'Manual',
  schedule: 'Schedule',
  pr: 'Pull Request',
};

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <div className="text-sm text-foreground truncate">{value}</div>
    </div>
  );
}

export default function ScanInfoSection({ scan }: { scan: Scan }) {
  const [copied, setCopied] = useState(false);

  const handleCopySha = async () => {
    try {
      await navigator.clipboard.writeText(scan.commit_sha);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable -- nothing sensible to fall back to here
    }
  };

  return (
    <div className="card-elevated p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Scan Information</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-4">
        <InfoField label="Repository" value={scan.repository} />
        <InfoField label="Workflow" value={scan.workflow_name || '—'} />
        <InfoField
          label="Workflow Run ID"
          value={
            scan.workflow_run_id ? (
              <span className="font-tabular">{scan.workflow_run_id}</span>
            ) : (
              '—'
            )
          }
        />
        <InfoField label="Run Attempt" value={scan.run_attempt ?? '—'} />
        <InfoField label="Branch" value={scan.branch} />
        <InfoField
          label="Commit SHA"
          value={
            <button
              onClick={handleCopySha}
              className="inline-flex items-center gap-1.5 font-mono text-primary/90 hover:text-primary transition-colors"
              title="Copy full commit SHA"
            >
              {shortSha(scan.commit_sha)}
              {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            </button>
          }
        />
        <InfoField label="Pull Request" value={scan.pr_number ? `#${scan.pr_number}` : '—'} />
        <InfoField label="Trigger Event" value={TRIGGER_LABEL[scan.trigger] ?? scan.trigger} />
        <InfoField label="Triggered By" value={scan.author ?? 'Unknown'} />
        <InfoField label="Started At" value={formatDateTime(scan.started_at)} />
        <InfoField label="Ended At" value={formatDateTime(scan.completed_at)} />
        <InfoField label="Total Duration" value={formatDuration(scan.duration_seconds)} />
      </div>
    </div>
  );
}
