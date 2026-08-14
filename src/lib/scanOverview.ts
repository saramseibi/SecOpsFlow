import type { ArtifactStatus, Scan, ScannerResult } from '@/types';

export type JobStatusDisplay =
  | 'Passed'
  | 'Failed'
  | 'Warning'
  | 'Skipped'
  | 'Running'
  | 'Cancelled';
export type OverallStatus =
  | 'passed'
  | 'completed_with_issues'
  | 'failed'
  | 'running'
  | 'cancelled'
  | 'artifact_pending';

export const JOB_ORDER = [
  'phpunit',
  'composer-audit',
  'npm-audit',
  'semgrep',
  'larastan',
  'php-insights',
  'security-tests',
  'dast',
] as const;

export const JOB_CONFIG: Record<
  string,
  { label: string; category: string; action: 'vulnerabilities' | 'tests' }
> = {
  phpunit: { label: 'PHPUnit', category: 'Tests', action: 'tests' },
  'composer-audit': {
    label: 'Composer Audit',
    category: 'Dependency Security',
    action: 'vulnerabilities',
  },
  'npm-audit': {
    label: 'NPM Audit',
    category: 'Dependency Security',
    action: 'vulnerabilities',
  },
  semgrep: { label: 'Semgrep', category: 'Code Security', action: 'vulnerabilities' },
  larastan: { label: 'Larastan', category: 'Static Analysis', action: 'tests' },
  'php-insights': { label: 'PHP Insights', category: 'Code Quality', action: 'tests' },
  'security-tests': { label: 'Security Tests', category: 'Security Tests', action: 'tests' },
  dast: { label: 'DAST Scan', category: 'Dynamic Security', action: 'vulnerabilities' },
};

export function jobLabel(scanner: string): string {
  return JOB_CONFIG[scanner]?.label ?? scanner;
}

export function jobCategory(result: ScannerResult): string {
  return result.category || JOB_CONFIG[result.scanner]?.category || 'Other';
}

export function jobDisplayStatus(result: ScannerResult): JobStatusDisplay {
  switch (result.status) {
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    case 'running':
      return 'Running';
    case 'cancelled':
      return 'Cancelled';
    default:
      return result.findings_count > 0 ? 'Warning' : 'Passed';
  }
}

/** Sort scanner_results into the fixed six-job display order; unrecognized jobs sort last. */
export function orderedJobs(results: ScannerResult[]): ScannerResult[] {
  return [...results].sort((a, b) => {
    const ai = JOB_ORDER.indexOf(a.scanner as (typeof JOB_ORDER)[number]);
    const bi = JOB_ORDER.indexOf(b.scanner as (typeof JOB_ORDER)[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export function deriveOverallStatus(scan: Scan): OverallStatus {
  if (scan.status === 'running') return 'running';
  if (scan.scanner_results.some((r) => r.status === 'cancelled')) return 'cancelled';
  // artifact_status only ever gets set once the primary security-scan workflow's
  // ci-security-report artifact is checked -- a dast_only scan never dispatches that
  // workflow, so it stays at its "waiting" default forever and isn't a real pending state.
  if (
    !scan.dast_only &&
    scan.status === 'completed' &&
    (scan.artifact_status === 'waiting' ||
      scan.artifact_status === 'pending' ||
      !scan.artifact_status)
  ) {
    return 'artifact_pending';
  }
  if (scan.status === 'failed' || scan.scanner_results.some((r) => r.status === 'failed'))
    return 'failed';
  if (scan.scanner_results.some((r) => r.status === 'completed' && r.findings_count > 0))
    return 'completed_with_issues';
  return 'passed';
}

export const OVERALL_STATUS_LABEL: Record<OverallStatus, string> = {
  passed: 'Passed',
  completed_with_issues: 'Completed with issues',
  failed: 'Failed',
  running: 'Running',
  cancelled: 'Cancelled',
  artifact_pending: 'Artifact pending',
};

export const ARTIFACT_STATUS_LABEL: Record<ArtifactStatus, string> = {
  waiting: 'Waiting for workflow',
  pending: 'Artifact pending',
  available: 'Available',
  missing: 'Missing',
  invalid: 'Invalid JSON',
  download_failed: 'Download failed',
  expired: 'Expired',
};

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function findingsNoun(scanner: string, count: number): string {
  if (scanner === 'composer-audit')
    return `${count} vulnerable ${count === 1 ? 'dependency' : 'dependencies'}`;
  if (scanner === 'npm-audit')
    return `${count} vulnerable ${count === 1 ? 'dependency' : 'dependencies'}`;
  if (scanner === 'semgrep')
    return `${count} code-security ${count === 1 ? 'finding' : 'findings'}`;
  if (scanner === 'larastan') return `${count} static-analysis ${count === 1 ? 'error' : 'errors'}`;
  if (scanner === 'php-insights') return `${count} quality ${count === 1 ? 'warning' : 'warnings'}`;
  return `${count} ${count === 1 ? 'finding' : 'findings'}`;
}

export interface ScanConclusion {
  title: string;
  body: string;
}

export function buildConclusion(scan: Scan): ScanConclusion | null {
  if (scan.status === 'running') return null;

  const results = scan.scanner_results;
  const failedJobs = results.filter((r) => r.status === 'failed');
  if (failedJobs.length > 0) {
    return {
      title: 'Scan failed',
      body: `${joinList(failedJobs.map((r) => jobLabel(r.scanner)))} reported failures. Review the affected jobs for more details.`,
    };
  }

  const issueJobs = results.filter((r) => r.status === 'completed' && r.findings_count > 0);
  if (issueJobs.length > 0) {
    const parts = issueJobs.map(
      (r) => `${jobLabel(r.scanner)} detected ${findingsNoun(r.scanner, r.findings_count)}`
    );
    return {
      title: 'Scan completed with issues',
      body: `Tests completed successfully, but ${joinList(parts)}.`,
    };
  }

  return {
    title: 'Scan completed successfully',
    body: 'All configured tests and security checks passed. No reportable security findings were detected.',
  };
}

export function shortSha(sha: string, length = 7): string {
  return sha.slice(0, length);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export interface TestCounts {
  passed: number | null;
  failed: number | null;
  skipped: number | null;
}


export function parseTestCounts(summary: string | null): TestCounts {
  if (!summary) return { passed: null, failed: null, skipped: null };
  const match = (word: string) => {
    const m = summary.match(new RegExp(`(\\d+)\\s+${word}`, 'i'));
    return m ? Number(m[1]) : null;
  };
  return { passed: match('passed'), failed: match('failed'), skipped: match('skipped') };
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Tunis',
  });
}
