import React from 'react';
import { CheckCircle2, XCircle, Loader2, Activity, Clock, ShieldAlert } from 'lucide-react';
import CountUp from '@/components/motion/CountUp';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import type { ScansSummary } from '@/types';

interface ScansStatsBarProps {
  summary: ScansSummary | null;
  loading: boolean;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

// Same treatment as the dashboard's secondary metrics row: one card, hairline-divided
// cells, a round tinted icon per metric.
export default function ScansStatsBar({ summary, loading }: ScansStatsBarProps) {
  const running = summary?.running ?? 0;

  const stats: {
    key: string;
    label: string;
    value: React.ReactNode;
    icon: React.ElementType;
    tone: string;
    spin?: boolean;
  }[] = [
    {
      key: 'stat-total-scans',
      label: 'Total Scans',
      value: <CountUp value={summary?.total ?? 0} />,
      icon: Activity,
      tone: 'var(--primary)',
    },
    {
      key: 'stat-completed',
      label: 'Completed',
      value: <CountUp value={summary?.completed ?? 0} />,
      icon: CheckCircle2,
      tone: 'var(--success)',
    },
    {
      key: 'stat-failed',
      label: 'Failed',
      value: <CountUp value={summary?.failed ?? 0} />,
      icon: XCircle,
      tone: 'var(--critical)',
    },
    {
      key: 'stat-running',
      label: 'Running Now',
      value: <CountUp value={running} />,
      icon: Loader2,
      tone: 'var(--low)',
      spin: running > 0,
    },
    {
      key: 'stat-avg-duration',
      label: 'Avg. Duration',
      value: formatDuration(summary?.avg_duration_seconds ?? 0),
      icon: Clock,
      tone: 'var(--info)',
    },
    {
      key: 'stat-total-findings',
      label: 'Total Findings',
      value: <CountUp value={summary?.total_findings ?? 0} />,
      icon: ShieldAlert,
      tone: 'var(--high)',
    },
  ];

  return (
    <div className="card-elevated overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-border">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.key}
              className="bg-card px-4 sm:px-5 py-4 flex items-center gap-3.5 min-w-0"
              style={{ '--tone': stat.tone } as React.CSSProperties}
            >
              <div className="tone w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon
                  size={16}
                  strokeWidth={1.9}
                  aria-hidden="true"
                  className={stat.spin ? 'animate-spin' : undefined}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <div className="h-7 flex items-center">
                  {loading ? (
                    <Skeleton className="h-5 w-12" />
                  ) : (
                    <span className="text-xl font-semibold tracking-tight text-foreground font-tabular">
                      {stat.value}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
