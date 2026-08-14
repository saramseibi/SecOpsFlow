'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ScannerStat } from '@/types';

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { critical: number } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Total: <span className="text-foreground font-semibold font-tabular">{payload[0].value}</span></p>
      {payload[0].payload.critical > 0 && (
        <p className="text-critical">Critical: <span className="font-semibold font-tabular">{payload[0].payload.critical}</span></p>
      )}
    </div>
  );
}

export default function ScannerBarChart() {
  const [data, setData] = useState<ScannerStat[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/scanner-stats')
      .then((res) => (res.ok ? res.json() : []))
      .then((stats) => {
        if (!cancelled && Array.isArray(stats)) setData(stats);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Findings by Scanner</h3>
        <p className="text-xs text-muted-foreground">Total vulnerabilities detected per tool</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          barSize={16}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="scanner"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="count" radius={[0, 3, 3, 0]}>
            {data.map((entry) => (
              <Cell
                key={`cell-scanner-${entry.scanner}`}
                fill={entry.critical > 5 ? '#ef4444' : entry.critical > 0 ? '#f97316' : 'var(--primary)'}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}