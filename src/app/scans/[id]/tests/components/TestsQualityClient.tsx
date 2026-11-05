'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import JobStatusBadge from '@/app/scans/[id]/components/JobStatusBadge';
import { JOB_CONFIG, formatDuration } from '@/lib/scanOverview';
import type { Scan } from '@/types';

const TESTS_QUALITY_SCANNERS = ['phpunit', 'larastan', 'php-insights', 'security-tests'];

export default function TestsQualityClient({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/scans/${scanId}`, { cache: 'no-store' })
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (!cancelled && data) setScan(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scanId]);

  if (loading) {
    return <TableSkeleton rows={4} cols={5} />;
  }

  if (notFound || !scan) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="Scan not found"
        description="This scan doesn't exist, or you don't have access to its repository."
      />
    );
  }

  const jobs = TESTS_QUALITY_SCANNERS.map((scanner) => ({
    scanner,
    config: JOB_CONFIG[scanner],
    result: scan.scanner_results.find((r) => r.scanner === scanner) ?? null,
  }));

  return (
    <div className="space-y-4">
      <Link
        href={`/scans/${scan.id}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={13} /> Back to Scan Overview
      </Link>

      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {scan.repository} #{scan.scan_number ?? '—'}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Test, static-analysis, and code-quality results for this run
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map(({ scanner, config, result }) => (
          <div key={scanner} className="card-elevated p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
                <span className="tag-scanner mt-1 inline-block">{config.category}</span>
              </div>
              {result ? (
                <JobStatusBadge result={result} />
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-sm scan-skipped">
                  Skipped
                </span>
              )}
            </div>
            <p className="text-sm text-foreground mb-2">
              {result?.summary ?? 'No result reported for this job.'}
            </p>
            <p className="text-xs text-muted-foreground">
              Duration: {formatDuration(result?.duration_seconds ?? null)}
            </p>
            {result?.error_message && (
              <p className="text-xs text-critical mt-2 leading-snug">{result.error_message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
