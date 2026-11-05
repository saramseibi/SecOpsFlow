// Chart colors resolve from the design tokens in src/styles/tailwind.css, so charts
// stay in sync with badges and cards. SVG presentation attributes accept var().
export const CHART = {
  critical: 'rgb(var(--critical))',
  high: 'rgb(var(--high))',
  medium: 'rgb(var(--medium))',
  low: 'rgb(var(--low))',
  info: 'rgb(var(--info))',
  primary: 'rgb(var(--primary))',
  grid: 'rgb(var(--border))',
  axis: 'rgb(var(--muted-foreground))',
  cursor: 'rgb(var(--foreground) / 0.04)',
} as const;

export const AXIS_TICK = { fontSize: 11, fill: CHART.axis, fontFamily: 'var(--font-mono)' };
