'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, ShieldAlert, ScanLine, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


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
  { key: 'nav-vulnerabilities', label: 'Vulnerabilities', href: '/vulnerabilities', icon: ShieldAlert },
  { key: 'nav-scans', label: 'Scans', href: '/scans', icon: ScanLine },
];

const BOTTOM_ITEMS: NavItem[] = [
  { key: 'nav-settings', label: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

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

  return (
    <aside
      className={`
        relative flex flex-col h-full bg-secondary border-r border-border sidebar-transition overflow-hidden
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 px-3 border-b border-border flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-1'}`}>
        <AppLogo size={68} />
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-foreground tracking-tight">SecOpsFlow</span>
            
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
        {!collapsed && (
          <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Overview
          </p>
        )}
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <div key={item.key} className="relative group">
                <Link
                  href={item.href}
                  className={`nav-item ${active ? 'active' : ''} ${collapsed ? 'justify-center px-0 w-10 mx-auto' : ''}`}
                >
                  <Icon size={17} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={`
                            text-[10px] font-semibold px-1.5 py-0.5 rounded-full font-tabular
                            ${item.badgeVariant === 'critical' ? 'bg-critical text-white' : ''}
                            ${item.badgeVariant === 'warning' ? 'bg-warning text-black' : ''}
                            ${item.badgeVariant === 'info' ? 'bg-primary text-white' : ''}
                          `}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
                {/* Collapsed tooltip */}
                {collapsed && (
                  <div className="tooltip-base left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                    {item.label}
                    {item.badge !== undefined && (
                      <span className="ml-1.5 text-critical font-semibold">({item.badge})</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!collapsed && (
          <div className="mt-4 mb-2 border-t border-border pt-4">
            <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Configuration
            </p>
          </div>
        )}
        {collapsed && <div className="mt-3 mb-3 border-t border-border" />}

        <div className="flex flex-col gap-0.5">
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <div key={item.key} className="relative group">
                <Link
                  href={item.href}
                  className={`nav-item ${active ? 'active' : ''} ${collapsed ? 'justify-center px-0 w-10 mx-auto' : ''}`}
                >
                  <Icon size={17} className="flex-shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                </Link>
                {collapsed && (
                  <div className="tooltip-base left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
          <div className="relative group">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className={`nav-item text-danger hover:bg-danger/10 disabled:opacity-60 w-full ${collapsed ? 'justify-center px-0 w-10 mx-auto' : ''}`}
            >
              <LogOut size={17} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1 truncate text-left">{signingOut ? 'Signing out…' : 'Sign Out'}</span>}
            </button>
            {collapsed && (
              <div className="tooltip-base left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                Sign Out
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Status indicator */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted">
            <span className="live-dot w-2 h-2 rounded-full bg-success flex-shrink-0" />
            <div className="flex flex-col leading-none">
              <span className="text-[11px] font-medium text-foreground">Scanner Active</span>
      
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-[0.10rem] bottom-3 z-10 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}