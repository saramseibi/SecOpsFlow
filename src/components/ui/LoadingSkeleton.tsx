import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`skeleton-shimmer rounded-md ${className}`} aria-hidden="true" />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 fade-in">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={`kpi-skel-${i}`} className="card-elevated p-5">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-9 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-elevated p-5">
          <Skeleton className="h-5 w-36 mb-4" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="card-elevated p-5 lg:col-span-2">
          <Skeleton className="h-5 w-44 mb-4" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
      {/* Table */}
      <div className="card-elevated p-5">
        <Skeleton className="h-5 w-40 mb-5" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={`row-skel-${i}`} className="flex gap-4 py-3 border-b border-border last:border-0">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 10, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`trow-skel-${i + 1}`} className="flex gap-4 px-4 py-3 border-b border-border">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={`tcell-skel-${i + 1}-${j + 1}`} className={`h-4 ${j === 0 ? 'w-16' : j === 1 ? 'flex-1' : 'w-20'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}