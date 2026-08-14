import React from 'react';
import AppLayout from '@/components/AppLayout';
import VulnerabilityDetailClient from '@/app/vulnerabilities/[id]/components/VulnerabilityDetailClient';

export default async function VulnerabilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      title="Vulnerability Details"
      subtitle="Full finding information, impact, and remediation guidance"
    >
      <VulnerabilityDetailClient vulnId={id} />
    </AppLayout>
  );
}
