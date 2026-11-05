'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import GitHubMark from '@/components/ui/GitHubMark';
import type { CurrentUser } from '@/hooks/useCurrentUser';

interface TopbarProps {
  title: string;
  subtitle?: string;
  user: CurrentUser | null;
  onUserChange: (updater: (prev: CurrentUser | null) => CurrentUser | null) => void;
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const SECTIONS = [
  { href: '/vulnerabilities', label: 'Vulnerabilities' },
  { href: '/scans', label: 'Scans' },
  { href: '/settings', label: 'Settings' },
];

function sectionFor(pathname: string) {
  const match = SECTIONS.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
  if (!match) return { href: '/', label: 'Dashboard', nested: false };
  return { ...match, nested: pathname !== match.href };
}

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export default function Topbar({
  title,
  subtitle,
  user,
  onUserChange,
  onMenuClick,
  sidebarCollapsed,
  onToggleSidebar,
}: TopbarProps) {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  const [githubMenuOpen, setGithubMenuOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [modKey, setModKey] = useState('Ctrl');
  const githubMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMac()) setModKey('⌘');
  }, []);

  useEffect(() => {
    if (!githubMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (githubMenuRef.current && !githubMenuRef.current.contains(e.target as Node)) {
        setGithubMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGithubMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [githubMenuOpen]);

  const handleDisconnectGithub = async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/github/disconnect', { method: 'DELETE' });
    } finally {
      setDisconnecting(false);
      setGithubMenuOpen(false);
      onUserChange((prev) =>
        prev ? { ...prev, github_username: null, github_avatar_url: null } : prev
      );
    }
  };

  return (
    <header className="h-16 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 border-b border-border/80 bg-background/75 backdrop-blur-xl flex-shrink-0 relative z-20">
      {/* Mobile: open drawer */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Open navigation"
      >
        <Menu size={19} />
      </button>

      {/* Desktop: collapse / expand sidebar */}
      <div className="relative group hidden md:block">
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          aria-keyshortcuts="Control+B Meta+B"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <div
          role="tooltip"
          className="tooltip-base top-full mt-2 left-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 group-hover:delay-500"
        >
          {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background border border-border-strong text-muted-foreground">
            {modKey} B
          </kbd>
        </div>
      </div>

      <span aria-hidden="true" className="hidden md:block h-6 w-px bg-border mx-1" />

      {/* Breadcrumb + title */}
      <div className="flex-1 min-w-0">
        <nav
          aria-label="Breadcrumb"
          className="hidden sm:flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground/80 mb-1"
        >
          <span>Console</span>
          <ChevronRight size={11} className="opacity-60" aria-hidden="true" />
          {section.nested ? (
            <Link href={section.href} className="hover:text-foreground transition-colors">
              {section.label}
            </Link>
          ) : (
            <span className="text-foreground/75" aria-current="page">
              {section.label}
            </span>
          )}
        </nav>
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="text-[15px] sm:text-base font-semibold tracking-tight text-foreground truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden xl:block text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* GitHub status */}
      {user?.github_username ? (
        <div className="relative" ref={githubMenuRef}>
          <button
            onClick={() => setGithubMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={githubMenuOpen}
            className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-full bg-card ring-1 ring-border-strong hover:ring-success/40 transition-shadow"
          >
            {user.github_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.github_avatar_url} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <span className="w-6 h-6 rounded-full bg-background flex items-center justify-center">
                <GitHubMark size={13} className="text-foreground" />
              </span>
            )}
            <span className="text-xs font-medium text-foreground max-w-[9rem] truncate hidden sm:inline">
              {user.github_username}
            </span>
            <span className="flex items-center gap-1.5 pl-2 border-l border-border-strong">
              <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgb(var(--success))]" />
              <span className="sr-only">Connected</span>
              <ChevronDown
                size={13}
                aria-hidden="true"
                className={`text-muted-foreground transition-transform duration-200 ${githubMenuOpen ? 'rotate-180' : ''}`}
              />
            </span>
          </button>
          {githubMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-60 bg-card border border-border-strong rounded-xl shadow-xl z-30 p-1.5 origin-top-right animate-scale-in"
            >
              <div className="flex items-center gap-2.5 px-2.5 py-2.5 mb-1 border-b border-border">
                <GitHubMark size={16} className="text-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="eyebrow !text-[10px]">GitHub account</p>
                  <p className="text-xs font-medium text-foreground truncate mt-0.5">
                    {user.github_username}
                  </p>
                </div>
              </div>
              <button
                role="menuitem"
                onClick={handleDisconnectGithub}
                disabled={disconnecting}
                className="w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-lg text-xs font-medium text-danger hover:bg-danger/10 transition-colors disabled:opacity-60"
              >
                <LogOut size={13} />
                {disconnecting ? 'Disconnecting…' : 'Disconnect GitHub'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => {
            window.location.href = '/api/auth/github/start';
          }}
          className="btn-ghost !h-9 !py-0 !px-3 !text-xs !rounded-full"
        >
          <GitHubMark size={14} />
          <span className="hidden sm:inline">Connect GitHub</span>
          <span className="sm:hidden">Connect</span>
        </button>
      )}
    </header>
  );
}
