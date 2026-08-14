'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RefreshCw,
  Eye,
  GitCommit,
  GitBranch,
  Clock,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import ScanStatusBadge from './ScanStatusBadge';
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
type SortDir = 'asc' | 'desc';

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

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown size={11} className="text-muted-foreground/40" />;
  return sortDir === 'asc' ? (
    <ChevronUp size={11} className="text-primary" />
  ) : (
    <ChevronDown size={11} className="text-primary" />
  );
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
  const thSort = `${thClass} cursor-pointer hover:text-foreground transition-colors select-none`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className={thSort} onClick={() => handleSort('scan_number')}>
              <div className="flex items-center gap-1">
                Scan ID <SortIcon col="scan_number" sortKey={sortKey} sortDir={sortDir} />
              </div>
            </th>
            <th className={thSort} onClick={() => handleSort('repository')}>
              <div className="flex items-center gap-1">
                Repository <SortIcon col="repository" sortKey={sortKey} sortDir={sortDir} />
              </div>
            </th>
            <th className={thClass}>Branch / Commit</th>
            <th className={thClass}>Author</th>
            <th className={thClass}>Trigger</th>
            <th className={thSort} onClick={() => handleSort('started_at')}>
              <div className="flex items-center gap-1">
                Started <SortIcon col="started_at" sortKey={sortKey} sortDir={sortDir} />
              </div>
            </th>
            <th className={thSort} onClick={() => handleSort('duration_seconds')}>
              <div className="flex items-center gap-1">
                Duration <SortIcon col="duration_seconds" sortKey={sortKey} sortDir={sortDir} />
              </div>
            </th>
            <th className={thSort} onClick={() => handleSort('total_vulnerabilities')}>
              <div className="flex items-center gap-1">
                Findings{' '}
                <SortIcon col="total_vulnerabilities" sortKey={sortKey} sortDir={sortDir} />
              </div>
            </th>
            <th className={thSort} onClick={() => handleSort('status')}>
              <div className="flex items-center gap-1">
                Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
              </div>
            </th>
            <th className={thClass}>Actions</th>
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
                    <span className="text-xs font-bold text-primary font-mono font-tabular">
                      #{scan.scan_number}
                    </span>
                  </td>

                  {/* Repository */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-foreground">{scan.repository}</span>
                  </td>

                  {/* Branch / Commit */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <GitBranch size={10} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                          {scan.branch}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GitCommit size={10} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-[11px] font-mono text-primary/70">
                          {scan.commit_sha}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Author */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0">
                        {scan.author
                          ? scan.author
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                          : '?'}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {scan.author ?? 'Unknown'}
                      </span>
                    </div>
                  </td>

                  {/* Trigger */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-sm ${triggerCfg.className}`}
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
                            <span className="text-[10px] font-semibold px-1 py-0 rounded-sm severity-critical font-tabular">
                              {scan.critical_count}C
                            </span>
                          )}
                          {scan.high_count > 0 && (
                            <span className="text-[10px] font-semibold px-1 py-0 rounded-sm severity-high font-tabular">
                              {scan.high_count}H
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
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
                          className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label={`View scan #${scan.scan_number} overview`}
                        >
                          <Eye size={13} />
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
                            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            aria-label={`Retry scan #${scan.scan_number}`}
                          >
                            <RefreshCw size={13} />
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
                                <span className="text-[11px] font-semibold text-foreground truncate">
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
                                    <span className="text-[10px] text-muted-foreground font-tabular">
                                      {formatDuration(sr.duration_seconds)}
                                    </span>
                                  </div>
                                )}
                                {sr.status === 'running' && (
                                  <span className="text-[10px] text-primary">Scanning...</span>
                                )}
                                {sr.status !== 'running' && (
                                  <div className="flex items-center gap-1">
                                    <Zap size={9} className="text-muted-foreground" />
                                    <span
                                      className={`text-[10px] font-semibold font-tabular ${
                                        sr.findings_count > 0 ? 'text-warning' : 'text-success'
                                      }`}
                                    >
                                      {sr.findings_count} findings
                                    </span>
                                  </div>
                                )}
                                {sr.error_message && (
                                  <p className="text-[10px] text-critical leading-snug mt-1">
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
