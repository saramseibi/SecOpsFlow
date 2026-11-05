'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { ShieldOff, RefreshCw, X } from 'lucide-react';
import VulnFilterBar, { type VulnFilters } from './VulnFilterBar';
import VulnerabilityTable from './VulnerabilityTable';
import VulnPagination from './VulnPagination';
import BulkActionBar from './BulkActionBar';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Vulnerability, VulnStatus } from '@/types';

const DEFAULT_FILTERS: VulnFilters = {
  search: '',
  severity: 'All Severities',
  scanner: 'All Scanners',
  status: 'All Statuses',
  repository: 'All Repositories',
  type: 'All Types',
};

const DEFAULT_PAGE_SIZE = 10;

interface FilterOptions {
  scanners: string[];
  repositories: string[];
  types: string[];
}

export default function VulnerabilitiesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const scanId = searchParams.get('scan_id');

  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    scanners: [],
    repositories: [],
    types: [],
  });

  const [filters, setFilters] = useState<VulnFilters>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/vulnerabilities/filters')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setFilterOptions(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (scanId) params.set('scan_id', scanId);
    if (filters.severity !== 'All Severities') params.set('severity', filters.severity);
    if (filters.scanner !== 'All Scanners') params.set('scanner', filters.scanner);
    if (filters.status !== 'All Statuses') params.set('status', filters.status);
    if (filters.repository !== 'All Repositories') params.set('repository', filters.repository);
    if (filters.type !== 'All Types') params.set('type', filters.type);
    if (debouncedSearch) params.set('search', debouncedSearch);
    params.set('page', String(currentPage));
    params.set('page_size', String(pageSize));
    return params.toString();
  }, [scanId, filters, debouncedSearch, currentPage, pageSize]);

  const refetch = useCallback(() => {
    setLoading(true);
    return fetch(`/api/vulnerabilities?${buildQuery()}`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((data) => {
        setVulns(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        setVulns([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [buildQuery]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleFiltersChange = (newFilters: VulnFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleStatusChange = async (id: string, status: VulnStatus) => {
    setVulns((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
    try {
      const res = await fetch(`/api/vulnerabilities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to update status.');
      refetch();
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === vulns.length && vulns.every((v) => selectedIds.has(v.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(vulns.map((v) => v.id)));
    }
  };

  const allSelected = vulns.length > 0 && vulns.every((v) => selectedIds.has(v.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleBulkAction = async (status: VulnStatus) => {
    const ids = Array.from(selectedIds);
    const count = ids.length;
    setVulns((prev) => prev.map((v) => (selectedIds.has(v.id) ? { ...v, status } : v)));
    setSelectedIds(new Set());
    const label =
      status === 'resolved'
        ? 'resolved'
        : status === 'ignored'
          ? 'ignored'
          : 'marked as false positive';
    try {
      const res = await fetch('/api/vulnerabilities/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${count} ${count === 1 ? 'vulnerability' : 'vulnerabilities'} ${label}`);
    } catch {
      toast.error('Bulk update failed.');
      refetch();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {scanId ? 'Scan Vulnerabilities' : 'All Vulnerabilities'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {scanId
              ? `${total.toLocaleString()} findings scoped to this scan`
              : `${total.toLocaleString()} findings across all repositories and scanners`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scanId && (
            <button onClick={() => router.push(pathname)} className="btn-ghost text-xs">
              <X size={13} /> Clear scan filter
            </button>
          )}
          <button onClick={() => refetch()} className="btn-ghost text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <VulnFilterBar
        filters={filters}
        onChange={handleFiltersChange}
        totalCount={total}
        filteredCount={vulns.length}
        scannerOptions={filterOptions.scanners}
        repositoryOptions={filterOptions.repositories}
        typeOptions={filterOptions.types}
      />

      {/* Table card */}
      <div className="card-elevated overflow-hidden">
        {loading ? (
          <TableSkeleton rows={pageSize} cols={12} />
        ) : vulns.length === 0 ? (
          <EmptyState
            icon={ShieldOff}
            title="No vulnerabilities found"
            description="No findings match your current filters. Try adjusting the severity, scanner, or status filters, or clear all filters to see all vulnerabilities."
            action={
              <button
                onClick={() => handleFiltersChange(DEFAULT_FILTERS)}
                className="btn-ghost text-xs"
              >
                Clear all filters
              </button>
            }
          />
        ) : (
          <>
            <VulnerabilityTable
              vulnerabilities={vulns}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              allSelected={allSelected}
              someSelected={someSelected}
              onStatusChange={handleStatusChange}
            />
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

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onMarkResolved={() => handleBulkAction('resolved')}
        onIgnore={() => handleBulkAction('ignored')}
        onMarkFalsePositive={() => handleBulkAction('false_positive')}
      />
    </div>
  );
}
