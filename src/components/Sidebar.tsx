'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, ShieldAlert, ScanLine, Settings, LogOut, X } from 'lucide-react';
import { gsap, prefersReducedMotion } from '@/lib/motion';
import type { CurrentUser } from '@/hooks/useCurrentUser';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  badgeVariant?: 'critical' | 'warning' | 'info';
}

const NAV_ITEMS: NavItem[] = [
  { key: 'nav-dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    key: 'nav-vulnerabilities',
    label: 'Vulnerabilities',
    href: '/vulnerabilities',
    icon: ShieldAlert,
  },
  { key: 'nav-scans', label: 'Scans', href: '/scans', icon: ScanLine },
];

const BOTTOM_ITEMS: NavItem[] = [
  { key: 'nav-settings', label: 'Settings', href: '/settings', icon: Settings },
];

// Where the active-item highlight sat on the previous page, so it can glide to the new one.
const INDICATOR_KEY = 'secopsflow:nav-indicator-y';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  user: CurrentUser | null;
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) return <div className="mx-auto my-3 h-px w-6 bg-border-strong" />;
  return <p className="eyebrow px-3 pt-1 pb-2">{children}</p>;
}

function CollapsedTooltip({ label, show }: { label: string; show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="tooltip"
      className="tooltip-base left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0 transition-[opacity,transform] duration-150"
    >
      {label}
    </div>
  );
}

function Avatar({ user, size = 32 }: { user: CurrentUser | null; size?: number }) {
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '—';
  if (user?.github_avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.github_avatar_url}
        alt=""
        width={size}
        height={size}
        className="rounded-lg flex-shrink-0 ring-1 ring-border-strong"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="rounded-lg flex-shrink-0 flex items-center justify-center font-mono text-[11px] font-semibold text-primary bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/25"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

export default function Sidebar({ collapsed, mobileOpen, onMobileClose, user }: SidebarProps) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      // Hard navigation -- router.push/refresh preserve client component state, which is
      // exactly what must NOT survive into the next user's session.
      window.location.href = '/signup';
    }
  };

  // Sliding active-item highlight. Each page mounts its own layout, so the previous position
  // is kept in sessionStorage and the highlight glides from there to the current item.
  useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-active="true"]');
      if (!active) return null;
      // Relative to the list (each item sits in its own positioned wrapper, so offsetTop
      // would always be 0).
      const listBox = list.getBoundingClientRect();
      const box = active.getBoundingClientRect();
      return {
        x: box.left - listBox.left,
        y: box.top - listBox.top,
        width: box.width,
        height: box.height,
      };
    };

    const rect = measure();
    if (!rect) {
      gsap.set(indicator, { autoAlpha: 0 });
      return;
    }

    // Stored as { path, y, fromY, at }. A record for this same path written moments ago means
    // the effect is re-running (Strict Mode, collapse toggle), so reuse its starting point.
    let fromY: number | null = null;
    try {
      const raw = sessionStorage.getItem(INDICATOR_KEY);
      const prev = raw ? JSON.parse(raw) : null;
      if (prev && prev.path !== pathname) fromY = prev.y;
      else if (prev && Date.now() - prev.at < 1000) fromY = prev.fromY;
      sessionStorage.setItem(
        INDICATOR_KEY,
        JSON.stringify({ path: pathname, y: rect.y, fromY, at: Date.now() })
      );
    } catch {
      // Storage unavailable or malformed -- just place it.
    }

    gsap.killTweensOf(indicator);
    if (fromY !== null && fromY !== rect.y && !prefersReducedMotion()) {
      gsap.set(indicator, { ...rect, y: fromY, autoAlpha: 1 });
      gsap.to(indicator, { y: rect.y, duration: 0.55, ease: 'power3.inOut' });
    } else {
      gsap.set(indicator, { ...rect, autoAlpha: 1 });
    }

    // Keep it aligned while the sidebar width animates (collapse / expand). Only the
    // horizontal box is synced here, so an in-flight vertical slide isn't interrupted.
    const ro = new ResizeObserver(() => {
      const next = measure();
      if (next) gsap.set(indicator, { x: next.x, width: next.width, height: next.height });
    });
    ro.observe(list);
    return () => {
      ro.disconnect();
      gsap.killTweensOf(indicator);
    };
  }, [pathname, collapsed]);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <div key={item.key} className="relative group">
        <Link
          href={item.href}
          data-active={active}
          aria-current={active ? 'page' : undefined}
          aria-label={collapsed ? item.label : undefined}
          className={`relative z-10 flex items-center gap-3 h-9 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
            collapsed ? 'w-10 mx-auto justify-center' : 'px-3'
          } ${
            active
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
          }`}
        >
          <Icon
            size={17}
            strokeWidth={1.85}
            className={`flex-shrink-0 transition-colors ${active ? 'text-primary' : ''}`}
          />
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`
                    text-[10px] font-semibold px-1.5 py-0.5 rounded-full font-tabular
                    ${item.badgeVariant === 'critical' ? 'bg-critical text-black' : ''}
                    ${item.badgeVariant === 'warning' ? 'bg-warning text-black' : ''}
                    ${item.badgeVariant === 'info' ? 'bg-primary text-primary-foreground' : ''}
                  `}
                >
                  {item.badge}
                </span>
              )}
            </>
          )}
        </Link>
        <CollapsedTooltip
          show={collapsed}
          label={item.badge !== undefined ? `${item.label} (${item.badge})` : item.label}
        />
      </div>
    );
  };

  const displayName = user?.github_username || user?.email?.split('@')[0] || '';

  return (
    <aside
      aria-label="Primary"
      className={`
        fixed inset-y-0 left-0 z-40 w-[17rem] flex flex-col h-full bg-shell border-r border-border
        sidebar-transition
        ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full max-md:invisible'}
        md:relative md:z-30 md:translate-x-0 md:shadow-none md:border-r-0 md:bg-transparent
        ${collapsed ? 'md:w-[4.5rem]' : 'md:w-64'}
      `}
    >
      {/* Brand */}
      <div
        className={`flex items-center h-16 flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3 px-4'}`}
      >
        <Link
          href="/"
          aria-label="SecOpsFlow home"
          className="flex-shrink-0 flex items-center justify-center -my-2 rounded-md"
        >
          <AppLogo size={collapsed ? 48 : 52} />
        </Link>
        {!collapsed && (
          <div className="flex flex-col leading-none min-w-0 flex-1">
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              SecOps<span className="text-brand">Flow</span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/80 mt-1.5 tracking-[0.12em] uppercase">
              Security console
            </span>
          </div>
        )}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 -mr-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav. Collapsed: overflow stays visible so the hover tooltips aren't clipped. */}
      <nav
        aria-label="Main"
        className={`flex-1 pt-3 pb-4 px-3 ${collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}
      >
        <div ref={listRef} className="relative">
          {/* Sliding active highlight */}
          <span
            ref={indicatorRef}
            aria-hidden="true"
            className="absolute left-0 top-0 rounded-lg pointer-events-none invisible bg-gradient-to-r from-primary/[0.17] via-primary/[0.08] to-primary/[0.03] ring-1 ring-inset ring-primary/20 shadow-[0_0_28px_-8px_rgb(var(--primary)/0.55)]"
          >
            <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary shadow-[0_0_12px_rgb(var(--primary))]" />
          </span>

          <SectionLabel collapsed={collapsed}>Overview</SectionLabel>
          <div className="flex flex-col gap-1">{NAV_ITEMS.map(renderItem)}</div>

          <div className={collapsed ? '' : 'mt-7'}>
            <SectionLabel collapsed={collapsed}>Configuration</SectionLabel>
          </div>
          <div className="flex flex-col gap-1">{BOTTOM_ITEMS.map(renderItem)}</div>
        </div>
      </nav>

      {/* Footer: scanner status + account */}
      <div className="p-3 flex-shrink-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="relative group">
              <div className="relative">
                <Avatar user={user} size={34} />
                <span
                  className="live-dot absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-shell"
                  aria-hidden="true"
                />
              </div>
              <CollapsedTooltip show label={user?.email ?? 'Account'} />
            </div>
            <div className="relative group">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label="Sign out"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-60"
              >
                <LogOut size={16} />
              </button>
              <CollapsedTooltip show label="Sign Out" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 pb-3 font-mono text-[10.5px] tracking-wide text-muted-foreground">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
              Scanner active
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-card/70 ring-1 ring-border shadow-[inset_0_1px_0_rgb(255_255_255/0.03)]">
              <Avatar user={user} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[13px] font-medium text-foreground truncate">
                  {displayName || ' '}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email ?? ' '}</p>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label={signingOut ? 'Signing out' : 'Sign out'}
                title="Sign out"
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-60"
              >
                {signingOut ? (
                  <span className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                ) : (
                  <LogOut size={15} />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
