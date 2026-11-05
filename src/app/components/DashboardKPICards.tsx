'use client';

import React from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  ScanLine,
  ArrowUpRight,
  Check,
} from 'lucide-react';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import CountUp from '@/components/motion/CountUp';
import { Skeleton } from '@/components/ui/LoadingSkeleton';

function formatRelative(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

type Variant = 'default' | 'critical' | 'high' | 'success' | 'running';

// Each variant maps to one RGB token; the card derives its edge, glow and icon chip from it.
const TONE: Record<Variant, string> = {
  default: 'var(--primary)',
  critical: 'var(--critical)',
  high: 'var(--high)',
  success: 'var(--success)',
  running: 'var(--low)',
};

// The latest-scan card takes the scan's outcome, so a failed scan never shows as green.
const SCAN_VARIANT: Record<string, Variant> = {
  completed: 'success',
  failed: 'critical',
  running: 'running',
};

interface KPICardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  /** Findings added in the last 7 days; replaces the subtitle when given. */
  newThisWeek?: number;
  icon: React.ElementType;
  variant?: Variant;
  loading?: boolean;
}

function WeeklyDelta({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Check size={12} strokeWidth={2.4} aria-hidden="true" />
        No new findings this week
      </span>
    );
  }
  return (
    <>
      <span className="inline-flex items-center gap-0.5 font-semibold font-tabular text-[rgb(var(--tone))]">
        <ArrowUpRight size={13} strokeWidth={2.4} aria-hidden="true" />
        {count.toLocaleString()}
      </span>
      <span>new in the last 7 days</span>
    </>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  newThisWeek,
  icon: Icon,
  variant = 'default',
  loading,
}: KPICardProps) {
  return (
    <div
      className="card-elevated group overflow-hidden p-4 sm:p-5 min-w-0 transition-colors duration-200 hover:border-[rgb(var(--tone)/0.35)]"
      style={{ '--tone': TONE[variant] } as React.CSSProperties}
    >
      {/* Tone edge + soft corner glow */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--tone)/0.7)] to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[rgb(var(--tone)/0.10)] blur-2xl opacity-70 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
        <p className="eyebrow max-sm:!text-[10px] leading-snug">{title}</p>
        <div className="tone w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon size={17} strokeWidth={1.9} />
        </div>
      </div>
      <div className="relative mb-2 min-h-[2.375rem] flex items-end">
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : typeof value === 'string' ? (
          // Text values ("3h ago", "No scans yet") read better a step below the numeric scale.
          <span className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
            {value}
          </span>
        ) : (
          <span className="text-hero-metric font-semibold text-foreground font-tabular">
            {value}
          </span>
        )}
      </div>
      <p className="relative flex items-center gap-1 text-xs text-muted-foreground truncate">
        {loading ? (
          ' '
        ) : newThisWeek !== undefined ? (
          <WeeklyDelta count={newThisWeek} />
        ) : (
          subtitle || ' '
        )}
      </p>
    </div>
  );
}

export default function DashboardKPICards() {
  const { summary, loading } = useDashboardSummary();

  const latestScan = summary?.latest_scan ?? null;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <KPICard
        title="Open Vulnerabilities"
        value={<CountUp value={summary?.total_vulnerabilities ?? 0} />}
        loading={loading}
        newThisWeek={summary?.new_this_week ?? 0}
        icon={ShieldAlert}
        variant="default"
      />
      <KPICard
        title="Critical Severity"
        value={<CountUp value={summary?.critical_count ?? 0} />}
        loading={loading}
        newThisWeek={summary?.critical_new_this_week ?? 0}
        icon={AlertOctagon}
        variant="critical"
      />
      <KPICard
        title="High Severity"
        value={<CountUp value={summary?.high_count ?? 0} />}
        loading={loading}
        newThisWeek={summary?.high_new_this_week ?? 0}
        icon={AlertTriangle}
        variant="high"
      />
      <KPICard
        title="Latest Scan"
        value={latestScan ? formatRelative(latestScan.started_at) : 'No scans yet'}
        loading={loading}
        subtitle={
          latestScan
            ? `${latestScan.status === 'failed' ? 'Failed · ' : latestScan.status === 'running' ? 'Running · ' : ''}${latestScan.repository} · ${latestScan.branch}`
            : ''
        }
        icon={ScanLine}
        variant={latestScan ? (SCAN_VARIANT[latestScan.status] ?? 'default') : 'default'}
      />
    </div>
  );
}
