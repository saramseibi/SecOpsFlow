import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsClient from '@/app/settings/components/SettingsClient';

export default function SettingsPage() {
  return (
    <AppLayout title="Settings" subtitle="Manage your account security">
      <SettingsClient />
    </AppLayout>
  );
}
