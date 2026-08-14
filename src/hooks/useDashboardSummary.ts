'use client';

import { useEffect, useState } from 'react';
import type { DashboardSummary } from '@/types';

interface UseDashboardSummaryResult {
  summary: DashboardSummary | null;
  loading: boolean;
  error: boolean;
}

/**
 * Global dashboard summary -- aggregates every repository the backend has scan data for.
 * Takes no repository/org argument by design; the Dashboard has no per-repo scope.
 */
export function useDashboardSummary(): UseDashboardSummaryResult {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch('/api/dashboard/summary')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { summary, loading, error };
}
