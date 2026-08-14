'use client';

import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

export interface VulnFilters {
  search: string;
  severity: string;
  scanner: string;
  status: string;
  repository: string;
  type: string;
}

interface VulnFilterBarProps {
  filters: VulnFilters;
  onChange: (filters: VulnFilters) => void;
  totalCount: number;
  filteredCount: number;
  scannerOptions: string[];
  repositoryOptions: string[];
  typeOptions: string[];
}

const SEVERITY_OPTIONS = ['All Severities', 'critical', 'high', 'medium', 'low', 'info'];
const STATUS_OPTIONS = ['All Statuses', 'open', 'in_progress', 'resolved', 'ignored', 'false_positive'];

function FilterSelect({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-1.5 bg-muted border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors cursor-pointer"
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={`opt-${label}-${opt}`} value={opt}>
            {opt === 'in_progress' ? 'In Progress' :
             opt === 'false_positive' ? 'False Positive' :
             opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

export default function VulnFilterBar({
  filters,
  onChange,
  totalCount,
  filteredCount,
  scannerOptions,
  repositoryOptions,
  typeOptions,
}: VulnFilterBarProps) {
  const hasActiveFilters =
    filters.search ||
    filters.severity !== 'All Severities' ||
    filters.scanner !== 'All Scanners' ||
    filters.status !== 'All Statuses' ||
    filters.repository !== 'All Repositories' ||
    filters.type !== 'All Types';

  const clearFilters = () => {
    onChange({
      search: '',
      severity: 'All Severities',
      scanner: 'All Scanners',
      status: 'All Statuses',
      repository: 'All Repositories',
      type: 'All Types',
    });
  };

  return (
    <div className="card-elevated px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search title, CVE, CWE, file path..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filters */}
        <FilterSelect value={filters.severity} options={SEVERITY_OPTIONS} onChange={(v) => onChange({ ...filters, severity: v })} label="Severity filter" />
        <FilterSelect value={filters.scanner} options={['All Scanners', ...scannerOptions]} onChange={(v) => onChange({ ...filters, scanner: v })} label="Scanner filter" />
        <FilterSelect value={filters.status} options={STATUS_OPTIONS} onChange={(v) => onChange({ ...filters, status: v })} label="Status filter" />
        <FilterSelect value={filters.repository} options={['All Repositories', ...repositoryOptions]} onChange={(v) => onChange({ ...filters, repository: v })} label="Repository filter" />
        <FilterSelect value={filters.type} options={['All Types', ...typeOptions]} onChange={(v) => onChange({ ...filters, type: v })} label="Type filter" />

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
          >
            <X size={12} /> Clear filters
          </button>
        )}

        <div className="ml-auto text-xs text-muted-foreground font-tabular">
          Showing <span className="text-foreground font-semibold">{filteredCount}</span> of{' '}
          <span className="text-foreground font-semibold">{totalCount}</span>
        </div>
      </div>
    </div>
  );
}