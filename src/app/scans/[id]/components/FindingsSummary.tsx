'use client';

import React from 'react';
import Link from 'next/link';
import { Package, Code2, KeyRound, Ruler, Sparkles } from 'lucide-react';
import type { Scan } from '@/types';

function findingsFor(scan: Scan, scanner: string): number {
  return scan.scanner_results.find((r) => r.scanner === scanner)?.findings_count ?? 0;
}

const SEVERITY_ROWS: { key: keyof Scan; label: string; className: string }[] = [
  { key: 'critical_count', label: 'Critical', className: 'severity-critical' },
  { key: 'high_count', label: 'High', className: 'severity-high' },
  { key: 'medium_count', label: 'Medium', className: 'severity-medium' },
  { key: 'low_count', label: 'Low', className: 'severity-low' },
  { key: 'info_count', label: 'Informational', className: 'severity-info' },
];

export default function FindingsSummary({ scan }: { scan: Scan }) {
  const secretsFindings = scan.scanner_results
    .filter((r) => r.scanner.includes('secret') || r.scanner.includes('gitleaks'))
    .reduce((sum, r) => sum + r.findings_count, 0);

  const categories = [
    {
      icon: Package,
      label: 'Dependency vulnerabilities',
      count: findingsFor(scan, 'composer-audit'),
    },
    { icon: Code2, label: 'Code-security findings', count: findingsFor(scan, 'semgrep') },
    { icon: KeyRound, label: 'Potential secrets', count: secretsFindings },
    { icon: Ruler, label: 'Static-analysis errors', count: findingsFor(scan, 'larastan') },
    { icon: Sparkles, label: 'Code-quality warnings', count: findingsFor(scan, 'php-insights') },
  ];

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Findings Summary</h3>
        <Link href={`/vulnerabilities?scan_id=${scan.id}`} className="btn-ghost text-xs">
          View all vulnerabilities
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-5">
        {categories.map(({ icon: Icon, label, count }) => (
          <div key={label} className="rounded-lg border border-border p-3 bg-background/40">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
              <Icon size={12} />
              <span className="text-[10px] font-semibold uppercase tracking-wider leading-tight">
                {label}
              </span>
            </div>
            <p
              className={`text-lg font-bold font-tabular ${count > 0 ? 'text-warning' : 'text-foreground'}`}
            >
              {count}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SEVERITY_ROWS.map(({ key, label, className }) => (
          <span
            key={label}
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-sm font-tabular ${className}`}
          >
            {label}: {scan[key] as number}
          </span>
        ))}
      </div>
    </div>
  );
}
