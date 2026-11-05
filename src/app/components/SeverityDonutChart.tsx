'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { CHART } from '@/lib/chartTheme';
import { prefersReducedMotion } from '@/lib/motion';
import CountUp from '@/components/motion/CountUp';

function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
  return (
    <div className="bg-card/95 backdrop-blur border border-border-strong rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.payload.color }} />
        <span className="font-semibold text-foreground">{item.name}</span>
      </div>
      <p className="text-muted-foreground">{item.value.toLocaleString()} vulnerabilities</p>
      <p className="text-muted-foreground">{pct}% of total</p>
    </div>
  );
}

export default function SeverityDonutChart() {
  const { summary, loading } = useDashboardSummary();

  const data = [
    { name: 'Critical', value: summary?.critical_count ?? 0, color: CHART.critical },
    { name: 'High', value: summary?.high_count ?? 0, color: CHART.high },
    { name: 'Medium', value: summary?.medium_count ?? 0, color: CHART.medium },
    { name: 'Low', value: summary?.low_count ?? 0, color: CHART.low },
    { name: 'Info', value: summary?.info_count ?? 0, color: CHART.info },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col">
      <div className="relative flex-1">
        <ResponsiveContainer width="100%" height={208}>
          <PieChart>
            {/* Track ring, visible when there is no data yet */}
            <Pie
              data={[{ value: 1 }]}
              dataKey="value"
              innerRadius={66}
              outerRadius={92}
              fill="rgb(var(--muted))"
              stroke="none"
              isAnimationActive={false}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={66}
              outerRadius={92}
              paddingAngle={total > 0 ? 2 : 0}
              cornerRadius={3}
              dataKey="value"
              stroke="none"
              isAnimationActive={!prefersReducedMotion()}
              animationDuration={900}
            >
              {data.map((entry) => (
                <Cell key={`cell-sev-${entry.name}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {loading ? (
            <span className="text-2xl font-semibold text-muted-foreground">—</span>
          ) : (
            <CountUp
              value={total}
              className="text-[28px] leading-none font-semibold tracking-tight text-foreground font-tabular"
            />
          )}
          <span className="eyebrow !text-[10px] mt-1.5">Total</span>
        </div>
      </div>
      {/* Legend */}
      <ul className="mt-4 space-y-2">
        {data.map((item) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <li key={`legend-sev-${item.name}`} className="flex items-center gap-2.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground w-14">{item.name}</span>
              <span className="flex-1 h-1 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                <span
                  className="block h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                />
              </span>
              <span className="text-xs font-semibold text-foreground font-tabular w-10 text-right">
                {item.value.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
