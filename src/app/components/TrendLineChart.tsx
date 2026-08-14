'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,  } from 'recharts';
import type { TrendDataPoint } from '@/types';

type Range = '7d' | '30d' | '90d';

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2.5 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={`tip-${p.name}`} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground font-tabular">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function TrendLineChart() {
  const [range, setRange] = useState<Range>('7d');
  const [data, setData] = useState<TrendDataPoint[]>([]);

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Vulnerability Trend</h3>
          <p className="text-xs text-muted-foreground">Total findings over time</p>
        </div>
        <div className="flex items-center bg-muted rounded-md p-0.5">
          {(['7d', '30d', '90d'] as Range[]).map((r) => (
            <button
              key={`range-${r}`}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-all duration-150 ${
                range === r
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--primary)' }}
          />
          <Line
            type="monotone"
            dataKey="critical"
            name="Critical"
            stroke="#ef4444"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
            activeDot={{ r: 3, fill: '#ef4444' }}
          />
          <Line
            type="monotone"
            dataKey="high"
            name="High"
            stroke="#f97316"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
            activeDot={{ r: 3, fill: '#f97316' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}