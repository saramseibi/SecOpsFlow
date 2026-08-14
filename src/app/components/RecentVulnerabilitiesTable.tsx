'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SeverityBadge from '@/components/ui/SeverityBadge';
import StatusBadge from '@/components/ui/StatusBadge';
import type { Vulnerability } from '@/types';

function formatRelative(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function RecentVulnerabilitiesTable() {
  const [recent, setRecent] = useState<Vulnerability[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/recent-vulnerabilities?limit=8')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setRecent(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card-elevated overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Recent Vulnerabilities</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Latest findings across all repositories</p>
        </div>
        <Link
          href="/vulnerabilities"
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          View all <ArrowRight size={13} />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Severity</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Scanner</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">CVE</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Repository</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Detected</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((vuln) => (
              <tr
                key={vuln.id}
                className="table-row-hover border-b border-border last:border-0 group cursor-pointer"
              >
                <td className="px-5 py-3">
                  <SeverityBadge severity={vuln.severity} />
                </td>
                <td className="px-4 py-3 max-w-[260px]">
                  <p className="text-xs font-medium text-foreground truncate leading-relaxed">{vuln.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-mono">
                    {vuln.file_path}
                    {vuln.line_number ? `:${vuln.line_number}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="tag-scanner">{vuln.scanner}</span>
                </td>
                <td className="px-4 py-3">
                  {vuln.cve ? (
                    <span className="text-[11px] font-mono text-primary font-semibold">{vuln.cve}</span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-foreground">{vuln.repository}</span>
                    <span className="text-[11px] text-muted-foreground">{vuln.branch}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground font-tabular">{formatRelative(vuln.detected_at)}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={vuln.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}