'use client';

import React from 'react';
import { ClipboardCheck, Layers, ShieldAlert, FlaskConical } from 'lucide-react';
import OverallStatusBadge from '@/components/ui/OverallStatusBadge';
import { deriveOverallStatus, jobDisplayStatus, parseTestCounts } from '@/lib/scanOverview';
import type { Scan } from '@/types';

function Card({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-elevated p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={14} />
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );
}

export default function ScanSummaryCards({ scan }: { scan: Scan }) {
  const overallStatus = deriveOverallStatus(scan);

  const passedJobs = scan.scanner_results.filter((r) => jobDisplayStatus(r) === 'Passed').length;
  const totalJobs = scan.scanner_results.length;

  const securityFindings = scan.scanner_results
    .filter((r) => r.scanner === 'composer-audit' || r.scanner === 'semgrep')
    .reduce((sum, r) => sum + r.findings_count, 0);

  const phpunit = scan.scanner_results.find((r) => r.scanner === 'phpunit') ?? null;
  const testCounts = parseTestCounts(phpunit?.summary ?? null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card icon={ClipboardCheck} label="Overall Status">
        <OverallStatusBadge status={overallStatus} size="sm" />
      </Card>

      <Card icon={Layers} label="Jobs">
        <p className="text-xl font-bold text-foreground font-tabular">
          {totalJobs > 0 ? `${passedJobs} / ${totalJobs}` : '—'}
          {totalJobs > 0 && (
            <span className="text-xs font-normal text-muted-foreground ml-1.5">passed</span>
          )}
        </p>
      </Card>

      <Card icon={ShieldAlert} label="Security Findings">
        <p
          className={`text-xl font-bold font-tabular ${securityFindings > 0 ? 'text-warning' : 'text-foreground'}`}
        >
          {securityFindings}
        </p>
      </Card>

      <Card icon={FlaskConical} label="Tests">
        {testCounts.passed !== null ? (
          <p className="text-xs font-tabular text-foreground">
            <span className="text-success font-semibold">{testCounts.passed} passed</span>
            {!!testCounts.failed && (
              <span className="text-critical font-semibold">, {testCounts.failed} failed</span>
            )}
            {!!testCounts.skipped && (
              <span className="text-muted-foreground">, {testCounts.skipped} skipped</span>
            )}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {phpunit?.summary ?? 'No test results yet'}
          </p>
        )}
      </Card>
    </div>
  );
}
