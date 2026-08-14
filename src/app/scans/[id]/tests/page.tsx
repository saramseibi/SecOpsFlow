import React from 'react';
import AppLayout from '@/components/AppLayout';
import TestsQualityClient from '@/app/scans/[id]/tests/components/TestsQualityClient';

export default async function TestsQualityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      title="Tests & Quality"
      subtitle="Test, static-analysis, and code-quality job details for this workflow run"
    >
      <TestsQualityClient scanId={id} />
    </AppLayout>
  );
}
