import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import VulnerabilitiesClient from '@/app/vulnerabilities/components/VulnerabilitiesClient';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function VulnerabilitiesPage() {
  return (
    <AppLayout
      title="Vulnerabilities"
      subtitle="Triage, filter, and remediate security findings across all repositories"
    >
      <Suspense fallback={<TableSkeleton rows={10} cols={12} />}>
        <VulnerabilitiesClient />
      </Suspense>
    </AppLayout>
  );
}
