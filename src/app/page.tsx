'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/AppLayout';
import DashboardKPICards from '@/app/components/DashboardKPICards';
import SecondaryMetricsRow from '@/app/components/SecondaryMetricsRow';
import RecentVulnerabilitiesTable from '@/app/components/RecentVulnerabilitiesTable';

const SeverityDonutChart = dynamic(() => import('@/app/components/SeverityDonutChart'), { ssr: false });
const TrendLineChart = dynamic(() => import('@/app/components/TrendLineChart'), { ssr: false });
const ScannerBarChart = dynamic(() => import('@/app/components/ScannerBarChart'), { ssr: false });

export default function DashboardPage() {
  return (
    <AppLayout
      title="Security Dashboard"
      subtitle="Vulnerability posture across all repositories"
    >
      <div className="space-y-5">
        {/* KPI Bento */}
        <DashboardKPICards />

        {/* Secondary metrics */}
        <SecondaryMetricsRow />

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Donut */}
          <section className="card-elevated p-5" aria-labelledby="sev-dist-title">
            <div className="mb-3">
              <h3 id="sev-dist-title" className="text-sm font-semibold text-foreground">Severity Distribution</h3>
              <p className="text-xs text-muted-foreground mt-0.5">All open vulnerabilities by severity</p>
            </div>
            <SeverityDonutChart />
          </section>

          {/* Trend line — spans 2 cols */}
          <section className="card-elevated p-5 lg:col-span-2">
            <TrendLineChart />
          </section>
        </div>

        {/* Scanner bar + table row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          <section className="card-elevated p-5">
            <ScannerBarChart />
          </section>
          <div className="lg:col-span-2 2xl:col-span-3 min-w-0">
            <RecentVulnerabilitiesTable />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
