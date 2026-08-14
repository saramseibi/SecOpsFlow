import React from 'react';
import AppLayout from '@/components/AppLayout';
import ScanOverviewClient from '@/app/scans/[id]/components/ScanOverviewClient';

export default async function ScanOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      title="Scan Overview"
      subtitle="Security, testing, and code-quality results for this workflow run"
    >
      <ScanOverviewClient scanId={id} />
    </AppLayout>
  );
}
