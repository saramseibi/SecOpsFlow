import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import ScansClient from '@/app/scans/components/ScansClient';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function ScansPage() {
  return (
    <AppLayout title="Scan History" subtitle="Every security pipeline run across your repositories">
      <Suspense fallback={<TableSkeleton rows={10} cols={10} />}>
        <ScansClient />
      </Suspense>
    </AppLayout>
  );
}
