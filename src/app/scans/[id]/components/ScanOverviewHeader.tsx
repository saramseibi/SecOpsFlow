'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import OverallStatusBadge from '@/components/ui/OverallStatusBadge';
import { deriveOverallStatus } from '@/lib/scanOverview';
import type { Scan } from '@/types';

interface ScanOverviewHeaderProps {
  scan: Scan;
}

export default function ScanOverviewHeader({ scan }: ScanOverviewHeaderProps) {
  const overallStatus = deriveOverallStatus(scan);
  const githubUrl = scan.workflow_run_id
    ? `https://github.com/${scan.repository}/actions/runs/${scan.workflow_run_id}`
    : null;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {scan.repository}{' '}
            <span className="text-muted-foreground font-normal">#{scan.scan_number ?? '—'}</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {scan.workflow_name || 'Security scan workflow'}
          </p>
        </div>
        <OverallStatusBadge status={overallStatus} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {githubUrl ? (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs"
          >
            <ExternalLink size={13} /> View workflow on GitHub
          </a>
        ) : (
          <span className="btn-ghost text-xs opacity-50 cursor-not-allowed" aria-disabled="true">
            <ExternalLink size={13} /> View workflow on GitHub
          </span>
        )}
      </div>
    </div>
  );
}
