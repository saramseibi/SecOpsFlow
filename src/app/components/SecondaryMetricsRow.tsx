'use client';

import React from 'react';
import { Clock, CheckCircle2, CheckCheck, Activity } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import CountUp from '@/components/motion/CountUp';
import { Skeleton } from '@/components/ui/LoadingSkeleton';

export default function SecondaryMetricsRow() {
  const { summary, loading } = useDashboardSummary();

  const STATS = [
    // "Open Findings" used to sit here and repeated the main KPI exactly.
    {
      key: 'stat-resolved-week',
      label: 'Resolved This Week',
      value: summary?.resolved_this_week ?? 0,
      icon: CheckCheck,
      tone: 'var(--success)',
    },
    {
      key: 'stat-resolved',
      label: 'Resolved (All Time)',
      value: summary?.resolved_count ?? 0,
      icon: CheckCircle2,
      tone: 'var(--success)',
    },
    {
      key: 'stat-mttr',
      label: 'Avg. MTTR',
      value: summary?.mttr_days ?? 0,
      decimals: 1,
      suffix: 'd',
      icon: Clock,
      tone: 'var(--primary)',
    },
    {
      key: 'stat-scans',
      label: 'Scans This Week',
      value: summary?.scans_this_week ?? 0,
      icon: Activity,
      tone: 'var(--warning)',
    },
  ];

  return (
    <div className="card-elevated grid grid-cols-2 xl:grid-cols-4 [&>*]:border-border max-xl:[&>*:nth-child(-n+2)]:border-b max-xl:[&>*:nth-child(odd)]:border-r xl:[&>*:not(:last-child)]:border-r">
      {STATS.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.key}
            className="px-4 sm:px-5 py-4 flex items-center gap-3.5 min-w-0"
            style={{ '--tone': stat.tone } as React.CSSProperties}
          >
            <div className="tone w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon size={16} strokeWidth={1.9} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
              <div className="h-7 flex items-center">
                {loading ? (
                  <Skeleton className="h-5 w-12" />
                ) : (
                  <CountUp
                    value={stat.value}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                    className="text-xl font-semibold tracking-tight text-foreground font-tabular"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
