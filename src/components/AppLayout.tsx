'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { usePageReveal } from '@/hooks/usePageReveal';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const COLLAPSE_KEY = 'secopsflow:sidebar-collapsed';

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, setUser } = useCurrentUser();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  usePageReveal(contentRef);

  // Remember the desktop collapse preference across pages (each page mounts its own layout).
  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') setSidebarCollapsed(true);
    } catch {
      // Storage unavailable (private mode, blocked site data) -- keep the default.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, prev ? '0' : '1');
      } catch {
        // ignore
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Escape closes the mobile drawer; Ctrl/Cmd+B toggles the sidebar (drawer on small screens).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileNavOpen(false);
        return;
      }
      if (e.key.toLowerCase() === 'b' && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        if (window.matchMedia('(min-width: 768px)').matches) toggleCollapsed();
        else setMobileNavOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleCollapsed]);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-shell">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] btn-primary"
      >
        Skip to content
      </a>

      <Sidebar
        collapsed={sidebarCollapsed && !mobileNavOpen}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        user={user}
      />

      {/* Mobile drawer backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setMobileNavOpen(false)}
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Content panel: inset and rounded on desktop, full-bleed on mobile */}
      <div className="flex-1 min-w-0 flex flex-col md:py-2 md:pr-2">
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-background md:rounded-2xl md:border md:border-border md:shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.03)]">
          <Topbar
            title={title}
            subtitle={subtitle}
            user={user}
            onUserChange={setUser}
            onMenuClick={() => setMobileNavOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleCollapsed}
          />
          <main
            id="main-content"
            ref={scrollRef}
            tabIndex={-1}
            className="app-canvas flex-1 overflow-y-auto overflow-x-hidden focus:outline-none"
          >
            <div
              ref={contentRef}
              data-page-reveal=""
              className="max-w-screen-2xl mx-auto px-4 py-5 sm:px-6 sm:py-6 xl:px-8 2xl:px-10 pb-16"
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
