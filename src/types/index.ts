export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type VulnStatus = 'open' | 'in_progress' | 'resolved' | 'ignored' | 'false_positive';
export type ScanStatus = 'running' | 'completed' | 'failed';
export type ScanTrigger = 'push' | 'manual' | 'schedule' | 'pr';
export type ArtifactStatus =
  | 'waiting'
  | 'pending'
  | 'available'
  | 'missing'
  | 'invalid'
  | 'download_failed'
  | 'expired';

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  scanner: string;
  vulnerability_type: string;
  file_path: string;
  line_number: number | null;
  dependency: string | null;
  installed_version: string | null;
  fixed_version: string | null;
  cve: string | null;
  cwe: string | null;
  cvss_score: number | null;
  recommendation: string;
  repository: string;
  branch: string;
  commit_sha: string;
  status: VulnStatus;
  detected_at: string;
}

export interface Scan {
  id: string;
  scan_number: number | null;
  repository: string;
  branch: string;
  commit_sha: string;
  author: string | null;
  trigger: ScanTrigger;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  status: ScanStatus;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  scanner_results: ScannerResult[];
  pr_number: number | null;

  workflow_run_id: string | null;
  run_attempt: number | null;
  workflow_name: string | null;

  artifact_status: ArtifactStatus | null;
  artifact_file_name: string | null;
  artifact_size_bytes: number | null;
  artifact_created_at: string | null;
  artifact_expires_at: string | null;
  artifact_last_checked_at: string | null;

  dast_workflow_run_id: string | null;
  dast_run_attempt: number | null;
  dast_workflow_name: string | null;
  dast_status: 'waiting' | 'running' | 'completed' | 'failed' | null;

  dast_artifact_status: ArtifactStatus | null;
  dast_artifact_file_name: string | null;
  dast_artifact_size_bytes: number | null;
  dast_artifact_created_at: string | null;
  dast_artifact_expires_at: string | null;
  dast_artifact_last_checked_at: string | null;

  // True when this scan was manually triggered against a DAST-only workflow (e.g. the
  // workflow picker's "OWASP ZAP Active Scan") rather than the primary security-scan
  // workflow -- the non-DAST job rows never ran and shouldn't show "Running".
  dast_only: boolean;
}

export interface ScannerResult {
  scanner: string;
  status: 'completed' | 'failed' | 'skipped' | 'running' | 'cancelled';
  duration_seconds: number | null;
  findings_count: number;
  error_message: string | null;
  category: string | null;
  summary: string | null;
}

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  org: string;
  default_branch: string;
  last_commit_sha: string;
  last_scanned_at: string;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  security_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  is_active: boolean;
}

export interface Scanner {
  id: string;
  name: string;
  category: string;
  description: string;
  is_enabled: boolean;
  last_scan_at: string | null;
  total_findings: number;
  version: string;
}

export interface DashboardSummary {
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  latest_scan: Scan | null;
  open_count: number;
  resolved_count: number;
  mttr_days: number;
  scans_this_week: number;
  /** Findings detected in the last 7 days, whatever their current status. */
  new_this_week: number;
  critical_new_this_week: number;
  high_new_this_week: number;
  /** Findings moved to resolved in the last 7 days. */
  resolved_this_week: number;
}

export interface TrendDataPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface ScannerStat {
  scanner: string;
  count: number;
  critical: number;
  high: number;
}

export interface GithubRepo {
  db_id: string; // internal Repository.id -- always populated by the backend's list_repos
  github_id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  default_branch: string;
}

export interface RepoWorkflow {
  id: number | string | null; // null when GitHub hasn't registered this branch's workflow file yet
  name: string | null;
  path: string | null;
  state: string | null;
}

export interface GithubOrg {
  login: string;
  avatar_url?: string | null;
}

export interface ScansSummary {
  total: number;
  completed: number;
  failed: number;
  running: number;
  avg_duration_seconds: number;
  total_findings: number;
}

export interface ScanListResponse {
  items: Scan[];
  total: number;
}
