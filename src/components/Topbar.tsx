'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Building2, ChevronDown, LogOut } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

interface CurrentUser {
  id: string;
  email: string;
  github_username?: string | null;
  github_avatar_url?: string | null;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [githubMenuOpen, setGithubMenuOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const githubMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) setUser(data.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!githubMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (githubMenuRef.current && !githubMenuRef.current.contains(e.target as Node)) {
        setGithubMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [githubMenuOpen]);

  const handleDisconnectGithub = async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/github/disconnect', { method: 'DELETE' });
    } finally {
      setDisconnecting(false);
      setGithubMenuOpen(false);
      setUser((prev) =>
        prev ? { ...prev, github_username: null, github_avatar_url: null } : prev
      );
    }
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '—';

  return (
    <header className="h-14 flex items-center gap-4 px-6 border-b border-border bg-secondary flex-shrink-0 relative z-20">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>

      {/* GitHub status */}
      {user?.github_username ? (
        <div className="relative" ref={githubMenuRef}>
          <button
            onClick={() => setGithubMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/10 border border-success/20 hover:bg-success/20 transition-colors"
          >
            <CheckCircle2 size={13} className="text-success" />
            <span className="text-xs font-medium text-success">{user.github_username}</span>
            <ChevronDown size={12} className={`text-success transition-transform ${githubMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {githubMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-md shadow-xl z-30 py-1 fade-in">
              <button
                onClick={handleDisconnectGithub}
                disabled={disconnecting}
                className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors disabled:opacity-60"
              >
                <LogOut size={13} />
                {disconnecting ? 'Disconnecting…' : 'Disconnect GitHub'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => { window.location.href = '/api/auth/github/start'; }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Building2 size={13} />
          Connect GitHub
        </button>
      )}

      {/* Profile */}
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
          {initials}
        </div>
        <span className="text-sm text-foreground hidden md:block">{user?.email ?? ''}</span>
      </div>
    </header>
  );
}
