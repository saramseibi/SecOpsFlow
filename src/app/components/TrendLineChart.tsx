'use client';

import React, { useEffect, useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrendDataPoint } from '@/types';
import { CHART, AXIS_TICK } from '@/lib/chartTheme';
import { prefersReducedMotion } from '@/lib/motion';

type Range = '7d' | '30d' | '90d';

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };
const RANGE_LABEL: Record<Range, string> = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days' };

const SERIES = [
  { key: 'total', name: 'Total', color: CHART.primary },
  { key: 'critical', name: 'Critical', color: CHART.critical },
  { key: 'high', name: 'High', color: CHART.high },
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border-strong rounded-lg px-3 py-2.5 shadow-xl text-xs min-w-[150px]">
      <p className="font-mono text-[11px] text-muted-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={`tip-${p.name}`} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground font-tabular">
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TrendLineChart() {
  const [range, setRange] = useState<Range>('7d');
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const animate = !prefersReducedMotion();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard/trend?days=${RANGE_DAYS[range]}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((points) => {
        if (!cancelled && Array.isArray(points)) setData(points);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with toggle */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Vulnerability Trend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Total findings over time</p>
        </div>
        <div className="flex items-center gap-4">
          <ul className="hidden sm:flex items-center gap-3" aria-label="Legend">
            {SERIES.map((s) => (
              <li
                key={s.key}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span className="w-2.5 h-[3px] rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </li>
            ))}
          </ul>
          <div
            role="group"
            aria-label="Time range"
            className="flex items-center bg-background/60 border border-border rounded-lg p-0.5"
          >
            {(['7d', '30d', '90d'] as Range[]).map((r) => (
              <button
                key={`range-${r}`}
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={`px-2.5 py-1 text-[11px] font-medium font-mono rounded-md transition-all duration-150 ${
                  range === r
                    ? 'bg-muted text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="sr-only">{RANGE_LABEL[r]}</span>
                <span aria-hidden="true">{r.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={232}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            minTickGap={16}
          />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: CHART.axis, strokeOpacity: 0.35, strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Total"
            stroke={CHART.primary}
            strokeWidth={2}
            fill="url(#gradTotal)"
            dot={false}
            activeDot={{ r: 4, fill: CHART.primary, stroke: 'rgb(var(--card))', strokeWidth: 2 }}
            isAnimationActive={animate}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="critical"
            name="Critical"
            stroke={CHART.critical}
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 3"
            activeDot={{ r: 3, fill: CHART.critical }}
            isAnimationActive={animate}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="high"
            name="High"
            stroke={CHART.high}
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 3"
            activeDot={{ r: 3, fill: CHART.high }}
            isAnimationActive={animate}
            animationDuration={900}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
