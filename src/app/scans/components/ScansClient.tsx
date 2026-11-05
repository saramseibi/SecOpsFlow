'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ScanLine } from 'lucide-react';
import ScanFilterBar, { type ScanFilters, ALL_REPOSITORIES } from './ScanFilterBar';
import ScanTable from './ScanTable';
import ScansStatsBar from './ScansStatsBar';
import VulnPagination from '@/app/vulnerabilities/components/VulnPagination';
import EmptyState from '@/components/ui/EmptyState';
import GitHubMark from '@/components/ui/GitHubMark';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useGithubAccountScope } from '@/hooks/useGithubAccountScope';
import type { RepoWorkflow, Scan, ScansSummary } from '@/types';

const DEFAULT_PAGE_SIZE = 10;

type TriggerScanState = 'idle' | 'loading' | 'success' | 'error';

export default function ScansClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFiltersState] = useState<ScanFilters>({
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? 'All Statuses',
    trigger: searchParams.get('trigger') ?? 'All Triggers',
    accountLogin: searchParams.get('account') ?? '',
    repositoryId: searchParams.get('repository') ?? ALL_REPOSITORIES,
  });
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(
    Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE
  );

  const [scans, setScans] = useState<Scan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ScansSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [scanState, setScanState] = useState<TriggerScanState>('idle');
  const [scanBranches, setScanBranches] = useState<string[]>([]);
  const [scanBranchesLoading, setScanBranchesLoading] = useState(false);
  const [scanBranch, setScanBranch] = useState('');
  const [scanWorkflows, setScanWorkflows] = useState<RepoWorkflow[]>([]);
  const [scanWorkflowsLoading, setScanWorkflowsLoading] = useState(false);
  const [scanWorkflowPath, setScanWorkflowPath] = useState('');

  const { personalLogin, userLoaded, accounts, repos, reposLoading, reconnectRequired } =
    useGithubAccountScope(filters.accountLogin);
  // Scan history is scoped to the user's GitHub accounts, so every fetch below waits for
  // their login. Without a GitHub connection that never arrives -- show a prompt instead
  // of leaving the skeletons up indefinitely.
  const githubNotConnected = userLoaded && !personalLogin;

  // Branches for the currently-selected repo, used by the "Run Scan Now" branch picker --
  // defaults to the repo's default branch, but lets a scan be dispatched against any branch
  // (e.g. testing a workflow on a feature branch without touching production).
  useEffect(() => {
    if (filters.repositoryId === ALL_REPOSITORIES) {
      setScanBranches([]);
      setScanBranch('');
      return;
    }
    let cancelled = false;
    setScanBranchesLoading(true);
    fetch(`/api/github/repos/branches?repository_id=${encodeURIComponent(filters.repositoryId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setScanBranches(Array.isArray(data.branches) ? data.branches : []);
        setScanBranch(data.default_branch ?? '');
      })
      .catch(() => {
        if (!cancelled) {
          setScanBranches([]);
          setScanBranch('');
        }
      })
      .finally(() => {
        if (!cancelled) setScanBranchesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.repositoryId]);

  // Workflows defined on the selected branch, for the "Run Scan Now" workflow picker --
  // different branches can carry different (or renamed/new) workflow files, so this is
  // re-fetched whenever the branch changes, not just the repo.
  useEffect(() => {
    if (filters.repositoryId === ALL_REPOSITORIES || !scanBranch) {
      setScanWorkflows([]);
      setScanWorkflowPath('');
      return;
    }
    let cancelled = false;
    setScanWorkflowsLoading(true);
    fetch(
      `/api/github/repos/workflows?repository_id=${encodeURIComponent(filters.repositoryId)}&branch=${encodeURIComponent(scanBranch)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const workflows: RepoWorkflow[] = Array.isArray(data) ? data : [];
        setScanWorkflows(workflows);
        setScanWorkflowPath(workflows[0]?.path ?? '');
      })
      .catch(() => {
        if (!cancelled) {
          setScanWorkflows([]);
          setScanWorkflowPath('');
        }
      })
      .finally(() => {
        if (!cancelled) setScanWorkflowsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.repositoryId, scanBranch]);

  // GitHub App user tokens expire; once the stored refresh_token can no longer renew it,
  // the account still looks "connected" (username/avatar persist) but every repos/orgs
  // call 401s. Tell the user explicitly instead of leaving them staring at an empty list.
  useEffect(() => {
    if (reconnectRequired) {
      toast.error('Your GitHub connection has expired. Please reconnect it in Settings.');
    }
  }, [reconnectRequired]);

  // Default account is Personal, once we know the user's own login (and only if the
  // URL didn't already specify one).
  useEffect(() => {
    if (!personalLogin) return;
    setFiltersState((prev) =>
      prev.accountLogin ? prev : { ...prev, accountLogin: personalLogin }
    );
  }, [personalLogin]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  // Keep the URL in sync with every filter so the page's scope is shareable/reloadable.
  useEffect(() => {
    if (!filters.accountLogin) return;
    const params = new URLSearchParams();
    params.set('account', filters.accountLogin);
    if (filters.repositoryId !== ALL_REPOSITORIES) params.set('repository', filters.repositoryId);
    if (filters.status !== 'All Statuses') params.set('status', filters.status);
    if (filters.trigger !== 'All Triggers') params.set('trigger', filters.trigger);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (currentPage > 1) params.set('page', String(currentPage));
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(pageSize));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [
    filters.accountLogin,
    filters.repositoryId,
    filters.status,
    filters.trigger,
    debouncedSearch,
    currentPage,
    pageSize,
    pathname,
    router,
  ]);

  // Backend query string. A specific repository (internal db_id) always wins over the
  // account filter -- the two are never sent together, mirroring routes/scans.py.
  const buildQuery = useCallback(
    (withPagination: boolean) => {
      const params = new URLSearchParams();
      if (filters.repositoryId !== ALL_REPOSITORIES) {
        params.set('repository_id', filters.repositoryId);
      } else if (filters.accountLogin) {
        params.set('account', filters.accountLogin);
      }
      if (filters.status !== 'All Statuses') params.set('status', filters.status);
      if (filters.trigger !== 'All Triggers') params.set('trigger', filters.trigger);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (withPagination) {
        params.set('page', String(currentPage));
        params.set('page_size', String(pageSize));
      }
      return params.toString();
    },
    [
      filters.repositoryId,
      filters.accountLogin,
      filters.status,
      filters.trigger,
      debouncedSearch,
      currentPage,
      pageSize,
    ]
  );

  const refetchScans = useCallback(() => {
    setLoading(true);
    return fetch(`/api/scans?${buildQuery(true)}`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((data) => {
        setScans(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        setScans([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [buildQuery]);

  const refetchSummary = useCallback(() => {
    setSummaryLoading(true);
    return fetch(`/api/scans/summary?${buildQuery(false)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [buildQuery]);

  useEffect(() => {
    if (!filters.accountLogin) return;
    refetchScans();
  }, [filters.accountLogin, buildQuery, refetchScans]);

  useEffect(() => {
    if (!filters.accountLogin) return;
    refetchSummary();
  }, [
    filters.accountLogin,
    filters.repositoryId,
    filters.status,
    filters.trigger,
    debouncedSearch,
    refetchSummary,
  ]);

  const handleFiltersChange = (newFilters: ScanFilters) => {
    setFiltersState(newFilters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    handleFiltersChange({
      search: '',
      status: 'All Statuses',
      trigger: 'All Triggers',
      accountLogin: filters.accountLogin,
      repositoryId: ALL_REPOSITORIES,
    });
  };

  // Once triggered, a scan's completion arrives asynchronously via GitHub's workflow_run
  // webhook -- poll the single-scan endpoint so the user finds out it finished (or that
  // the repo had no workflow to run and it failed immediately) instead of the button
  // just sitting there with no feedback.
  const pollScanStatus = useCallback(
    (scanId: string) => {
      const deadline = Date.now() + 5 * 60 * 1000; // give up after 5 minutes
      const tick = async () => {
        try {
          const res = await fetch(`/api/scans/${scanId}`);
          if (res.ok) {
            const scan = await res.json();
            if (scan.status !== 'running') {
              const ok = scan.status === 'completed';
              setScanState(ok ? 'success' : 'error');
              if (ok) {
                toast.success('Scan completed.');
              } else {
                toast.error(
                  'Scan failed — the repository may not have a compatible scan workflow.'
                );
              }
              refetchScans();
              refetchSummary();
              setTimeout(() => setScanState('idle'), 3000);
              return;
            }
          }
        } catch {
          // transient network error while polling -- keep trying until the deadline
        }
        if (Date.now() > deadline) {
          setScanState('error');
          toast.error('Timed out waiting for the scan to finish.');
          setTimeout(() => setScanState('idle'), 3000);
          return;
        }
        setTimeout(tick, 4000);
      };
      tick();
    },
    [refetchScans, refetchSummary]
  );

  const handleTriggerScan = async () => {
    const repo = repos.find((r) => r.db_id === filters.repositoryId);
    if (!repo) return;
    setScanState('loading');
    try {
      const res = await fetch('/api/github/repos/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository_id: repo.db_id,
          branch: scanBranch || undefined,
          workflow_path: scanWorkflowPath || undefined,
          workflow_id: scanWorkflows.find((w) => w.path === scanWorkflowPath)?.id ?? undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.scan_id) {
        toast.success('Scan triggered — waiting for result...');
        refetchScans();
        refetchSummary();
        pollScanStatus(data.scan_id);
      } else {
        setScanState('error');
        toast.error(data?.detail || 'Failed to trigger scan.');
        setTimeout(() => setScanState('idle'), 3000);
      }
    } catch {
      setScanState('error');
      toast.error('Unable to reach the server.');
      setTimeout(() => setScanState('idle'), 3000);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const selectedAccount = accounts.find((a) => a.login === filters.accountLogin);
  const selectedRepoName = repos.find((r) => r.db_id === filters.repositoryId)?.full_name;
  const accountScopeLabel = selectedRepoName
    ? `Scans for ${selectedRepoName}`
    : selectedAccount?.type === 'organization'
      ? `Every scan across the ${selectedAccount.login} organization`
      : 'Every scan across your personal repositories';

  return (
    <div className="space-y-4">
      {/* Summary cards -- scoped to the current account/repository filter */}
      <ScansStatsBar summary={summary} loading={summaryLoading && !githubNotConnected} />

      {/* Filters (search, account, repository, status, trigger, Run Scan Now) */}
      <ScanFilterBar
        filters={filters}
        onChange={handleFiltersChange}
        accounts={accounts}
        repos={repos}
        reposLoading={reposLoading}
        onTriggerScan={handleTriggerScan}
        scanState={scanState}
        scanBranches={scanBranches}
        scanBranchesLoading={scanBranchesLoading}
        scanBranch={scanBranch}
        onScanBranchChange={setScanBranch}
        scanWorkflows={scanWorkflows}
        scanWorkflowsLoading={scanWorkflowsLoading}
        scanWorkflowPath={scanWorkflowPath}
        onScanWorkflowChange={setScanWorkflowPath}
      />

      {/* Table card */}
      <div className="card-elevated overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Scan history</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{accountScopeLabel}</p>
          </div>
          {!loading && !githubNotConnected && (
            <p className="text-xs text-muted-foreground font-tabular whitespace-nowrap">
              <span className="text-foreground font-semibold">{total.toLocaleString()}</span>{' '}
              {total === 1 ? 'scan' : 'scans'}
            </p>
          )}
        </div>
        {githubNotConnected ? (
          <EmptyState
            icon={ScanLine}
            title="Connect GitHub to see your scans"
            description="Scan history is pulled from the repositories your GitHub account and organizations can access. Your account isn't linked to GitHub right now."
            action={
              <a href="/api/auth/github/start" className="btn-primary">
                <GitHubMark size={15} />
                Connect GitHub
              </a>
            }
          />
        ) : loading ? (
          <TableSkeleton rows={pageSize} cols={10} />
        ) : scans.length === 0 ? (
          <EmptyState
            icon={ScanLine}
            title="No scans found"
            description="No scans match your current filters. Try adjusting the status, repository, or trigger type filters."
            action={
              <button onClick={clearFilters} className="btn-ghost text-xs">
                Clear all filters
              </button>
            }
          />
        ) : (
          <>
            <ScanTable scans={scans} />
            <VulnPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={total}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
