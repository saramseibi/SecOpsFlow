'use client';

import React from 'react';
import { ShieldAlert, AlertOctagon, AlertTriangle, ScanLine, TrendingUp, TrendingDown,  } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';

function formatRelative(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}


interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  trend?: { direction: 'up' | 'down'; value: string; label: string };
  variant?: 'default' | 'critical' | 'high' | 'success' | 'info';
  badge?: string;
}

function KPICard({ title, value, subtitle, icon: Icon, trend, variant = 'default', badge }: KPICardProps) {
  const variantStyles = {
    default: 'border-border',
    critical: 'border-critical/40 bg-critical/5',
    high: 'border-high/30 bg-high/5',
    success: 'border-success/30 bg-success/5',
    info: 'border-primary/30 bg-primary/5',
  };

  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    critical: 'bg-critical/15 text-critical',
    high: 'bg-high/15 text-high',
    success: 'bg-success/15 text-success',
    info: 'bg-primary/15 text-primary',
  };

  return (
    <div className={`card-elevated p-5 ${variantStyles[variant]} transition-all duration-150 hover:border-opacity-60`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
          {badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-critical text-white">
              {badge}
            </span>
          )}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconStyles[variant]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mb-2">
        <span className="text-hero-metric font-bold text-foreground font-tabular">{value}</span>
      </div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
          trend.direction === 'up' ? 'text-critical' : 'text-success'
        }`}>
          {trend.direction === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{trend.value} {trend.label}</span>
        </div>
      )}
    </div>
  );
}

export default function DashboardKPICards() {
  const { summary, loading } = useDashboardSummary();

  const latestScan = summary?.latest_scan ?? null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <KPICard
        title="Total Vulnerabilities"
        value={loading ? '—' : String(summary?.total_vulnerabilities ?? 0)}
        subtitle="Currently open, across all repositories"
        icon={ShieldAlert}
        variant="default"
      />
      <KPICard
        title="Critical Severity"
        value={loading ? '—' : String(summary?.critical_count ?? 0)}
        subtitle="Requires immediate attention"
        icon={AlertOctagon}
        variant="critical"
      />
      <KPICard
        title="High Severity"
        value={loading ? '—' : String(summary?.high_count ?? 0)}
        subtitle="Should be addressed soon"
        icon={AlertTriangle}
        variant="high"
      />
      <KPICard
        title="Latest Scan"
        value={loading ? '—' : latestScan ? formatRelative(latestScan.started_at) : 'No scans yet'}
        subtitle={latestScan ? `${latestScan.repository} · ${latestScan.branch}` : ''}
        icon={ScanLine}
        variant="success"
      />
    </div>
  );
}