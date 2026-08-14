import type { Vulnerability, Scan, DashboardSummary, TrendDataPoint, ScannerStat,  } from '@/types';

export const mockVulnerabilities: Vulnerability[] = [];

export const mockScans: Scan[] = [];

export const mockTrendData: TrendDataPoint[] = [];

export const mockScannerStats: ScannerStat[] = [];

export const mockDashboardSummary: DashboardSummary = {
  total_vulnerabilities: 0,
  critical_count: 0,
  high_count: 0,
  medium_count: 0,
  low_count: 0,
  info_count: 0,
  latest_scan: null,
  open_count: 0,
  resolved_count: 0,
  mttr_days: 0,
  scans_this_week: 0,
};
