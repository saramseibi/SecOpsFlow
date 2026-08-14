'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ScanLine } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import ScanOverviewHeader from './ScanOverviewHeader';
import ScanInfoSection from './ScanInfoSection';
import ScanSummaryCards from './ScanSummaryCards';
import JobResultsTable from './JobResultsTable';
import FindingsSummary from './FindingsSummary';
import ScanConclusionSection from './ScanConclusionSection';
import type { Scan } from '@/types';

interface ScanOverviewClientProps {
  scanId: string;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="card-elevated p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={`info-skel-${i + 1}`} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`card-skel-${i + 1}`} className="card-elevated p-4">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="card-elevated p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export default function ScanOverviewClient({ scanId }: ScanOverviewClientProps) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchScan = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const res = await fetch(`/api/scans/${scanId}`, { cache: 'no-store' });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        setScan(data);
      } catch {
        if (!opts?.silent) toast.error('Failed to load this scan.');
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [scanId]
  );

  useEffect(() => {
    fetchScan();
  }, [fetchScan]);

  // A running scan's job list fills in incrementally as the webhook ingests each
  // artifact -- poll quietly so the page updates without a full-page loading flash.
  useEffect(() => {
    if (!scan || scan.status !== 'running') return;
    const t = setInterval(() => fetchScan({ silent: true }), 6000);
    return () => clearInterval(t);
  }, [scan, fetchScan]);

  if (!scanId) {
    return (
      <EmptyState
        icon={ScanLine}
        title="No scan selected"
        description="Choose a workflow run from the Scans page to see its full security, testing, and code-quality overview."
      />
    );
  }

  if (loading) {
    return <OverviewSkeleton />;
  }

  if (notFound || !scan) {
    return (
      <EmptyState
        icon={ScanLine}
        title="Scan not found"
        description="This scan doesn't exist, or you don't have access to its repository."
      />
    );
  }

  return (
    <div className="space-y-4 fade-in">
      <ScanOverviewHeader scan={scan} />
      <ScanInfoSection scan={scan} />
      <ScanSummaryCards scan={scan} />
      <JobResultsTable scan={scan} />
      <FindingsSummary scan={scan} />
      <ScanConclusionSection scan={scan} />
    </div>
  );
}
