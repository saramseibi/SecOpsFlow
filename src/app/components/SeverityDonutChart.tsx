'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';

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
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-xl text-xs">
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
    { name: 'Critical', value: summary?.critical_count ?? 0, color: '#ef4444' },
    { name: 'High', value: summary?.high_count ?? 0, color: '#f97316' },
    { name: 'Medium', value: summary?.medium_count ?? 0, color: '#f59e0b' },
    { name: 'Low', value: summary?.low_count ?? 0, color: '#3b82f6' },
    { name: 'Info', value: summary?.info_count ?? 0, color: '#6b7280' },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col ">
      <div className="relative flex-1">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
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
          <span className="text-2xl font-bold text-foreground font-tabular">{loading ? '—' : total.toLocaleString()}</span>
          <span className="text-[11px] text-muted-foreground">Total</span>
        </div>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
        {data.map((item) => (
          <div key={`legend-sev-${item.name}`} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-muted-foreground flex-1 truncate">{item.name}</span>
            <span className="text-xs font-semibold text-foreground font-tabular">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}