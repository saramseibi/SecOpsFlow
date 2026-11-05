'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, RefreshCw, Eye, GitCommit, GitBranch, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import ScanStatusBadge from './ScanStatusBadge';
import SortableHeader, { type SortDir } from '@/components/ui/SortableHeader';
import type { Scan, ScanTrigger } from '@/types';

interface ScanTableProps {
  scans: Scan[];
}

type SortKey =
  | 'scan_number'
  | 'repository'
  | 'started_at'
  | 'duration_seconds'
  | 'total_vulnerabilities'
  | 'status';

const TRIGGER_CONFIG: Record<ScanTrigger, { label: string; className: string }> = {
  push: { label: 'Push', className: 'bg-primary/10 text-primary border border-primary/20' },
  manual: { label: 'Manual', className: 'bg-muted text-muted-foreground border border-border' },
  schedule: { label: 'Schedule', className: 'bg-warning/10 text-warning border border-warning/20' },
  pr: { label: 'Pull Request', className: 'bg-success/10 text-success border border-success/20' },
};

function formatDuration(seconds: number | null) {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Tunis',
  });
}

export default function ScanTable({ scans }: ScanTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>('scan_number');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...scans].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'scan_number') return ((a.scan_number ?? 0) - (b.scan_number ?? 0)) * dir;
    if (sortKey === 'started_at')
      return (new Date(a.started_at).getTime() - new Date(b.started_at).getTime()) * dir;
    if (sortKey === 'duration_seconds')
      return ((a.duration_seconds ?? 0) - (b.duration_seconds ?? 0)) * dir;
    if (sortKey === 'total_vulnerabilities')
      return (a.total_vulnerabilities - b.total_vulnerabilities) * dir;
    const aVal = String(a[sortKey] ?? '');
    const bVal = String(b[sortKey] ?? '');
    return aVal.localeCompare(bVal) * dir;
  });

  const thClass =
    'px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider';
  const sortProps = { sortKey, sortDir, onSort: handleSort, className: thClass };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <SortableHeader column="scan_number" {...sortProps}>
              Scan ID
            </SortableHeader>
            <SortableHeader column="repository" {...sortProps}>
              Repository
            </SortableHeader>
            <th scope="col" className={thClass}>
              Branch / Commit
            </th>
            <th scope="col" className={thClass}>
              Author
            </th>
            <th scope="col" className={thClass}>
              Trigger
            </th>
            <SortableHeader column="started_at" {...sortProps}>
              Started
            </SortableHeader>
            <SortableHeader column="duration_seconds" {...sortProps}>
              Duration
            </SortableHeader>
            <SortableHeader column="total_vulnerabilities" {...sortProps}>
              Findings
            </SortableHeader>
            <SortableHeader column="status" {...sortProps}>
              Status
            </SortableHeader>
            <th scope="col" className={thClass}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((scan) => {
            const isExpanded = expandedId === scan.id;
            const triggerCfg = TRIGGER_CONFIG[scan.trigger];
            return (
              <React.Fragment key={scan.id}>
                <tr
                  className={`table-row-hover border-b border-border transition-colors cursor-pointer ${isExpanded ? 'bg-primary/5 border-primary/20' : ''}`}
                  onClick={() => setExpandedId(isExpanded ? null : scan.id)}
                >
                  {/* Scan ID */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : scan.id);
                      }}
                      aria-expanded={isExpanded}
                      aria-label={`Scan #${scan.scan_number}: ${isExpanded ? 'hide' : 'show'} scanner results`}
                      className="inline-flex items-center gap-1 rounded text-[13px] font-bold text-primary font-mono font-tabular"
                    >
                      <ChevronRight
                        size={13}
                        aria-hidden="true"
                        className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      />
                      #{scan.scan_number}
                    </button>
                  </td>

                  {/* Repository */}
                  <td className="px-4 py-3">
                    {/* Owner muted, repo name emphasized. */}
                    <span className="text-[13px] whitespace-nowrap" title={scan.repository}>
                      {scan.repository.includes('/') && (
                        <span className="text-muted-foreground">
                          {scan.repository.split('/')[0]}/
                        </span>
                      )}
                      <span className="font-medium text-foreground">
                        {scan.repository.split('/').slice(-1)[0]}
                      </span>
                    </span>
                  </td>

                  {/* Branch / Commit */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <GitBranch size={10} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {scan.branch}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GitCommit size={10} className="text-muted-foreground flex-shrink-0" />
                        {/* Short SHA like GitHub; the full 40-char hash pushed the Status
                            and Actions columns off-screen. Full value on hover. */}
                        <span
                          className="text-xs font-mono text-muted-foreground/80"
                          title={scan.commit_sha}
                        >
                          {scan.commit_sha?.slice(0, 7)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Author */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                        {scan.author
                          ? scan.author
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                          : '?'}
                      </div>
                      <span
                        className="text-xs text-muted-foreground max-w-[140px] truncate"
                        title={scan.author ?? undefined}
                      >
                        {scan.author ? scan.author.split('@')[0] : 'Unknown'}
                      </span>
                    </div>
                  </td>

                  {/* Trigger */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded-sm ${triggerCfg.className}`}
                    >
                      {triggerCfg.label}
                    </span>
                  </td>

                  {/* Started */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-muted-foreground font-tabular">
                      {formatDateTime(scan.started_at)}
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock size={11} className="text-muted-foreground" />
                      <span className="text-xs font-tabular text-muted-foreground">
                        {formatDuration(scan.duration_seconds)}
                      </span>
                    </div>
                  </td>

                  {/* Findings */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {scan.total_vulnerabilities > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground font-tabular">
                          {scan.total_vulnerabilities}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {scan.critical_count > 0 && (
                            <span className="text-[11px] font-semibold px-1 py-0 rounded-sm severity-critical font-tabular">
                              {scan.critical_count}C
                            </span>
                          )}
                          {scan.high_count > 0 && (
                            <span className="text-[11px] font-semibold px-1 py-0 rounded-sm severity-high font-tabular">
                              {scan.high_count}H
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {scan.status === 'running' ? '—' : '0'}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ScanStatusBadge status={scan.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <div className="relative group/view">
                        <button
                          onClick={() => router.push(`/scans/${scan.id}`)}
                          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label={`View scan #${scan.scan_number} overview`}
                        >
                          <Eye size={14} />
                        </button>
                        <span className="tooltip-base bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover/view:opacity-100 transition-opacity">
                          Scan overview
                        </span>
                      </div>
                      {scan.status === 'failed' && (
                        <div className="relative group/retry">
                          <button
                            onClick={() =>
                              toast.success(`Scan #${scan.scan_number} queued for retry`)
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            aria-label={`Retry scan #${scan.scan_number}`}
                          >
                            <RefreshCw size={14} />
                          </button>
                          <span className="tooltip-base bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover/retry:opacity-100 transition-opacity">
                            Retry scan
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded scanner pipeline row */}
                {isExpanded && (
                  <tr className="border-b border-border bg-background/50">
                    <td colSpan={10} className="px-6 py-4">
                      <div className="fade-in">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Scanner Pipeline Results
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                          {scan.scanner_results.map((sr) => (
                            <div
                              key={`sr-${scan.id}-${sr.scanner}`}
                              className={`rounded-lg border p-3 ${
                                sr.status === 'completed'
                                  ? 'border-success/20 bg-success/5'
                                  : sr.status === 'failed'
                                    ? 'border-critical/20 bg-critical/5'
                                    : sr.status === 'running'
                                      ? 'border-primary/20 bg-primary/5'
                                      : 'border-border bg-muted'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-foreground truncate">
                                  {sr.scanner}
                                </span>
                                {sr.status === 'completed' && (
                                  <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
                                )}
                                {sr.status === 'failed' && (
                                  <span className="w-2 h-2 rounded-full bg-critical flex-shrink-0" />
                                )}
                                {sr.status === 'running' && (
                                  <span className="live-dot w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                )}
                                {sr.status === 'skipped' && (
                                  <span className="w-2 h-2 rounded-full bg-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                              <div className="space-y-1">
                                {sr.duration_seconds !== null && (
                                  <div className="flex items-center gap-1">
                                    <Clock size={9} className="text-muted-foreground" />
                                    <span className="text-[11px] text-muted-foreground font-tabular">
                                      {formatDuration(sr.duration_seconds)}
                                    </span>
                                  </div>
                                )}
                                {sr.status === 'running' && (
                                  <span className="text-[11px] text-primary">Scanning...</span>
                                )}
                                {sr.status !== 'running' && (
                                  <div className="flex items-center gap-1">
                                    <Zap size={9} className="text-muted-foreground" />
                                    <span
                                      className={`text-[11px] font-semibold font-tabular ${
                                        sr.findings_count > 0 ? 'text-warning' : 'text-success'
                                      }`}
                                    >
                                      {sr.findings_count} findings
                                    </span>
                                  </div>
                                )}
                                {sr.error_message && (
                                  <p className="text-[11px] text-critical leading-snug mt-1">
                                    {sr.error_message}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
