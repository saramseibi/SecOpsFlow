'use client';

import React from 'react';
import { Clock, CheckCircle2, ShieldOff, Activity } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';

export default function SecondaryMetricsRow() {
  const { summary, loading } = useDashboardSummary();
  const v = (n: number | undefined) => (loading ? '—' : String(n ?? 0));

  const STATS = [
    {
      key: 'stat-open',
      label: 'Open Findings',
      value: v(summary?.open_count),
      sub: '',
      icon: ShieldOff,
      color: 'text-critical',
      iconBg: 'bg-critical/10',
    },
    {
      key: 'stat-resolved',
      label: 'Resolved',
      value: v(summary?.resolved_count),
      sub: '',
      icon: CheckCircle2,
      color: 'text-success',
      iconBg: 'bg-success/10',
    },
    {
      key: 'stat-mttr',
      label: 'Avg. MTTR',
      value: loading ? '—' : `${(summary?.mttr_days ?? 0).toFixed(1)}d`,
      sub: '',
      icon: Clock,
      color: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      key: 'stat-scans',
      label: 'Scans This Week',
      value: v(summary?.scans_this_week),
      sub: '',
      icon: Activity,
      color: 'text-warning',
      iconBg: 'bg-warning/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {STATS?.map((stat) => {
        const Icon = stat?.icon;
        return (
          <div key={stat?.key} className="card-elevated px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${stat?.iconBg}`}>
              <Icon size={17} className={stat?.color} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat?.label}</p>
              <p className="text-base font-bold text-foreground font-tabular">{stat?.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat?.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}