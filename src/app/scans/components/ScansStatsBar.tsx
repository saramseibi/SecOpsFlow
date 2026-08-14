import React from 'react';
import { CheckCircle2, XCircle, Loader2, Activity, Clock, ShieldAlert } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';
import type { ScansSummary } from '@/types';

interface ScansStatsBarProps {
  summary: ScansSummary | null;
  loading: boolean;
}

export default function ScansStatsBar({ summary, loading }: ScansStatsBarProps) {
  const v = (n: number | undefined) => (loading ? '—' : String(n ?? 0));
  const avgDuration = summary?.avg_duration_seconds ?? 0;

  const stats = [
    {
      key: 'stat-total-scans',
      label: 'Total Scans',
      value: v(summary?.total),
      icon: Activity,
      iconClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
    {
      key: 'stat-completed',
      label: 'Completed',
      value: v(summary?.completed),
      icon: CheckCircle2,
      iconClass: 'text-success',
      bgClass: 'bg-success/10',
    },
    {
      key: 'stat-failed',
      label: 'Failed',
      value: v(summary?.failed),
      icon: XCircle,
      iconClass: 'text-critical',
      bgClass: 'bg-critical/10',
    },
    {
      key: 'stat-running',
      label: 'Running Now',
      value: v(summary?.running),
      icon: Loader2,
      iconClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
    {
      key: 'stat-avg-duration',
      label: 'Avg. Duration',
      value: loading ? '—' : `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`,
      icon: Clock,
      iconClass: 'text-muted-foreground',
      bgClass: 'bg-muted',
    },
    {
      key: 'stat-total-findings',
      label: 'Total Findings',
      value: v(summary?.total_findings),
      icon: ShieldAlert,
      iconClass: 'text-warning',
      bgClass: 'bg-warning/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {stats?.map((stat) => {
        const Icon = stat?.icon;
        return (
          <div key={stat?.key} className="card-elevated px-4 py-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${stat?.bgClass}`}>
              <Icon size={15} className={stat?.iconClass} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{stat?.label}</p>
              <p className="text-sm font-bold text-foreground font-tabular">{stat?.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
