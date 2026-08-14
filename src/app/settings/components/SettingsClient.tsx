'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, AlertCircle, AlertTriangle } from 'lucide-react';

interface PasswordForm {
  current_password: string;
  new_password: string;
}

export default function SettingsClient() {
  const [form, setForm] = useState<PasswordForm>({ current_password: '', new_password: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const detail = data?.detail;
        const message = Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join(' ')
          : typeof detail === 'string'
            ? detail
            : 'Could not change your password.';
        setError(message);
        return;
      }
      toast.success('Password updated.');
      setForm({ current_password: '', new_password: '' });
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Could not delete your account. Please try again.');
        setDeleting(false);
        return;
      }
      // Hard navigation -- router.push/refresh preserve client component state, which is
      // exactly what must NOT survive into the next user's session.
      window.location.href = '/signup';
    } catch {
      toast.error('Unable to reach the server. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Change password */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-sm font-semibold text-foreground mb-1">Change Password</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Enter your current password and a new password to update your credentials.
        </p>

        <form onSubmit={handleSave} noValidate className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-critical/10 border border-critical/30 text-xs text-critical">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="current_password" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                id="current_password"
                name="current_password"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={form.current_password}
                onChange={handleChange}
                placeholder="Enter your current password"
                className="w-full bg-input border border-border rounded-lg pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="new_password" className="block text-xs font-medium text-muted-foreground mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                id="new_password"
                name="new_password"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={form.new_password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className="w-full bg-input border border-border rounded-lg pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full justify-center mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-danger/30 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-foreground mb-1">Delete Account</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-danger border border-danger/30 hover:bg-danger/10 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>Are you sure? This will permanently delete your account.</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-danger hover:bg-danger/90 transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete My Account'}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-foreground border border-border hover:bg-muted transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
