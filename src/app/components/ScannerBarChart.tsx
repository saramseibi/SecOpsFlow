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
import { CHART, AXIS_TICK } from '@/lib/chartTheme';
import { prefersReducedMotion } from '@/lib/motion';

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { critical: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border-strong rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-mono text-[11px] text-muted-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        Total:{' '}
        <span className="text-foreground font-semibold font-tabular">{payload[0].value}</span>
      </p>
      {payload[0].payload.critical > 0 && (
        <p className="text-critical">
          Critical:{' '}
          <span className="font-semibold font-tabular">{payload[0].payload.critical}</span>
        </p>
      )}
    </div>
  );
}

export default function ScannerBarChart() {
  const [data, setData] = useState<ScannerStat[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/scanner-stats')
      .then((res) => (res.ok ? res.json() : []))
      .then((stats) => {
        if (!cancelled && Array.isArray(stats)) setData(stats);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-foreground">Findings by Scanner</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Total vulnerabilities detected per tool
        </p>
      </div>
      {loaded && data.length === 0 ? (
        <div className="h-[232px] flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-border-strong">
          <p className="text-sm font-medium text-foreground">No scanner data yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Results appear once a scan completes.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={232}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barSize={12}
          >
            <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="scanner"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART.cursor }} />
            <Bar
              dataKey="count"
              radius={[0, 6, 6, 0]}
              background={{ fill: 'rgb(var(--muted) / 0.5)', radius: 6 }}
              isAnimationActive={!prefersReducedMotion()}
              animationDuration={900}
            >
              {data.map((entry) => (
                <Cell
                  key={`cell-scanner-${entry.scanner}`}
                  fill={
                    entry.critical > 5
                      ? CHART.critical
                      : entry.critical > 0
                        ? CHART.high
                        : CHART.primary
                  }
                  fillOpacity={0.9}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
