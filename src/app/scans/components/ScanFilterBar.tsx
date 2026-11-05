'use client';

import React from 'react';
import {
  Search,
  X,
  ChevronDown,
  Building2,
  GitBranch,
  Workflow,
  Play,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { GithubRepo, RepoWorkflow } from '@/types';

export interface AccountOption {
  type: 'personal' | 'organization';
  login: string;
}

export interface ScanFilters {
  search: string;
  status: string;
  trigger: string;
  accountLogin: string;
  repositoryId: string; // 'all' or an internal db_id
}

export const ALL_REPOSITORIES = 'all';

type ScanState = 'idle' | 'loading' | 'success' | 'error';

interface ScanFilterBarProps {
  filters: ScanFilters;
  onChange: (filters: ScanFilters) => void;
  accounts: AccountOption[];
  repos: GithubRepo[];
  reposLoading: boolean;
  onTriggerScan: () => void;
  scanState: ScanState;
  scanBranches: string[];
  scanBranchesLoading: boolean;
  scanBranch: string;
  onScanBranchChange: (branch: string) => void;
  scanWorkflows: RepoWorkflow[];
  scanWorkflowsLoading: boolean;
  scanWorkflowPath: string;
  onScanWorkflowChange: (path: string) => void;
}

const STATUS_OPTIONS = ['All Statuses', 'running', 'completed', 'failed'];
const TRIGGER_OPTIONS = ['All Triggers', 'push', 'manual', 'schedule', 'pr'];

function FilterSelect({
  value,
  options,
  onChange,
  label,
  render,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  label: string;
  render?: (opt: string) => string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 h-9 bg-input border border-border rounded-lg text-[13px] text-foreground focus:outline-none focus:border-primary/70 focus:ring-4 focus:ring-primary/15 hover:border-border-strong transition-colors cursor-pointer"
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={`scanopt-${label}-${opt}`} value={opt}>
            {render ? render(opt) : opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
    </div>
  );
}

export default function ScanFilterBar({
  filters,
  onChange,
  accounts,
  repos,
  reposLoading,
  onTriggerScan,
  scanState,
  scanBranches,
  scanBranchesLoading,
  scanBranch,
  onScanBranchChange,
  scanWorkflows,
  scanWorkflowsLoading,
  scanWorkflowPath,
  onScanWorkflowChange,
}: ScanFilterBarProps) {
  const hasActive =
    filters.search ||
    filters.status !== 'All Statuses' ||
    filters.trigger !== 'All Triggers' ||
    filters.repositoryId !== ALL_REPOSITORIES;

  const selectedRepo = repos.find((r) => r.db_id === filters.repositoryId) ?? null;

  return (
    <div className="card-elevated px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search scan ID, repository, commit SHA..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-8 pr-3 h-9 bg-input border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/70 focus:ring-4 focus:ring-primary/15 hover:border-border-strong transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Account dropdown */}
        <div className="relative">
          <Building2
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <select
            value={filters.accountLogin}
            onChange={(e) =>
              onChange({ ...filters, accountLogin: e.target.value, repositoryId: ALL_REPOSITORIES })
            }
            className="appearance-none pl-7 pr-8 h-9 bg-input border border-border rounded-lg text-[13px] text-foreground focus:outline-none focus:border-primary/70 focus:ring-4 focus:ring-primary/15 hover:border-border-strong transition-colors cursor-pointer max-w-[160px]"
            aria-label="Account filter"
          >
            {accounts.map((acc) => (
              <option key={`account-opt-${acc.login}`} value={acc.login}>
                {acc.type === 'personal' ? 'Personal' : acc.login}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>

        {/* Repository dropdown */}
        <div className="relative">
          <GitBranch
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <select
            value={filters.repositoryId}
            onChange={(e) => onChange({ ...filters, repositoryId: e.target.value })}
            disabled={reposLoading}
            className="appearance-none pl-7 pr-8 h-9 bg-input border border-border rounded-lg text-[13px] text-foreground focus:outline-none focus:border-primary/70 focus:ring-4 focus:ring-primary/15 hover:border-border-strong transition-colors cursor-pointer max-w-[180px] disabled:opacity-60"
            aria-label="Repository filter"
          >
            <option value={ALL_REPOSITORIES}>
              {reposLoading ? 'Loading…' : 'All Repositories'}
            </option>
            {repos.map((repo) => (
              <option key={`repo-opt-${repo.github_id}`} value={repo.db_id}>
                {repo.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>

        {/* Branch dropdown -- only meaningful once a specific repo is selected; controls
            which branch "Run Scan Now" dispatches against (defaults to the repo's default). */}
        {selectedRepo && (
          <div className="relative">
            <select
              value={scanBranch}
              onChange={(e) => onScanBranchChange(e.target.value)}
              disabled={scanBranchesLoading || scanBranches.length === 0}
              className="appearance-none pl-3 pr-8 h-9 bg-input border border-border rounded-lg text-[13px] text-foreground focus:outline-none focus:border-primary/70 focus:ring-4 focus:ring-primary/15 hover:border-border-strong transition-colors cursor-pointer max-w-[160px] disabled:opacity-60"
              aria-label="Branch to scan"
            >
              {scanBranchesLoading || scanBranches.length === 0 ? (
                <option>{scanBranchesLoading ? 'Loading…' : scanBranch || '—'}</option>
              ) : (
                scanBranches.map((b) => (
                  <option key={`branch-opt-${b}`} value={b}>
                    {b}
                  </option>
                ))
              )}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>
        )}

        {/* Workflow dropdown -- which of the branch's workflow files "Run Scan Now"
            dispatches, since a branch can carry a workflow no other branch has. */}
        {selectedRepo && scanBranch && (
          <div className="relative">
            <Workflow
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <select
              value={scanWorkflowPath}
              onChange={(e) => onScanWorkflowChange(e.target.value)}
              disabled={scanWorkflowsLoading || scanWorkflows.length === 0}
              className="appearance-none pl-7 pr-8 h-9 bg-input border border-border rounded-lg text-[13px] text-foreground focus:outline-none focus:border-primary/70 focus:ring-4 focus:ring-primary/15 hover:border-border-strong transition-colors cursor-pointer max-w-[180px] disabled:opacity-60"
              aria-label="Workflow to run"
            >
              {scanWorkflowsLoading ? (
                <option>Loading…</option>
              ) : scanWorkflows.length === 0 ? (
                <option>Auto-detect workflow</option>
              ) : (
                scanWorkflows.map((w) => (
                  <option key={`workflow-opt-${w.path}`} value={w.path ?? ''}>
                    {w.name ?? w.path}
                  </option>
                ))
              )}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>
        )}

        <FilterSelect
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(v) => onChange({ ...filters, status: v })}
          label="Scan status filter"
        />
        <FilterSelect
          value={filters.trigger}
          options={TRIGGER_OPTIONS}
          onChange={(v) => onChange({ ...filters, trigger: v })}
          label="Scan trigger filter"
        />

        {hasActive && (
          <button
            onClick={() =>
              onChange({
                search: '',
                status: 'All Statuses',
                trigger: 'All Triggers',
                accountLogin: filters.accountLogin,
                repositoryId: ALL_REPOSITORIES,
              })
            }
            className="h-9 flex items-center gap-1.5 px-3 text-[13px] text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <X size={12} /> Clear
          </button>
        )}

        {/* Run Scan Now — the only manual-scan trigger on this page, only enabled for a specific repo */}
        <button
          onClick={onTriggerScan}
          disabled={!selectedRepo || scanState === 'loading'}
          title={
            selectedRepo
              ? `Scan ${selectedRepo.full_name}@${scanBranch || selectedRepo.default_branch}${
                  scanWorkflowPath
                    ? ` using ${scanWorkflows.find((w) => w.path === scanWorkflowPath)?.name ?? scanWorkflowPath}`
                    : ''
                } now`
              : 'Select a specific repository to scan'
          }
          className={`ml-auto h-9 flex items-center gap-1.5 px-3.5 rounded-lg text-[13px] font-medium border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            scanState === 'success'
              ? 'bg-success/10 border-success/20 text-success'
              : scanState === 'error'
                ? 'bg-danger/10 border-danger/25 text-danger'
                : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
          }`}
        >
          {scanState === 'loading' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : scanState === 'success' ? (
            <CheckCircle2 size={13} />
          ) : (
            <Play size={13} />
          )}
          {scanState === 'loading'
            ? 'Scanning…'
            : scanState === 'success'
              ? 'Scan triggered'
              : scanState === 'error'
                ? 'Failed — retry'
                : 'Run Scan Now'}
        </button>
      </div>
    </div>
  );
}
