'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import JobStatusBadge from './JobStatusBadge';
import { JOB_CONFIG, JOB_ORDER } from '@/lib/scanOverview';
import type { Scan, ScannerResult } from '@/types';

function PendingStatusBadge({ scanRunning }: { scanRunning: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-sm ${scanRunning ? 'scan-running' : 'scan-skipped'}`}
    >
      {scanRunning ? 'Running' : 'Skipped'}
    </span>
  );
}

export default function JobResultsTable({ scan }: { scan: Scan }) {
  const resultsByScanner = new Map(scan.scanner_results.map((r) => [r.scanner, r]));
  const thClass =
    'px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider';

  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Job Results</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={thClass}>Job</th>
              <th className={thClass}>Category</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Result Summary</th>
              <th className={thClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {JOB_ORDER.map((scanner) => {
              const config = JOB_CONFIG[scanner];
              const result: ScannerResult | undefined = resultsByScanner.get(scanner);
              // The DAST workflow runs independently of the security-scan workflow this
              // scan.status tracks, so its pending state comes from scan.dast_status instead.
              // A dast_only scan (manually run against a DAST-only workflow) never dispatches
              // the other jobs at all, so they're never "Running" -- just skipped outright.
              const jobRunning =
                scanner === 'dast'
                  ? scan.dast_status === 'running'
                  : !scan.dast_only && scan.status === 'running';
              const actionHref =
                config.action === 'vulnerabilities'
                  ? `/vulnerabilities?scan_id=${scan.id}`
                  : `/scans/${scan.id}/tests`;
              const actionLabel =
                config.action === 'vulnerabilities' ? 'Vulnerabilities' : 'Tests & Quality';

              return (
                <tr key={scanner} className="table-row-hover border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-foreground">
                    {config.label}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="tag-scanner">{config.category}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {result ? <JobStatusBadge result={result} /> : <PendingStatusBadge scanRunning={jobRunning} />}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                    {result?.summary ?? (jobRunning ? 'Waiting to run…' : 'No result reported')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={actionHref}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      {actionLabel} <ExternalLink size={11} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
