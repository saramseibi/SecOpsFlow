import React from 'react';
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'sonner';
import '../styles/tailwind.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080a0e',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  title: 'SecOpsFlow — Automated Vulnerability Intelligence',
  description:
    'Scan Laravel/PHP projects on every GitHub commit with six security tools. Detect, triage, and remediate vulnerabilities before they reach production.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the inline script below adds a data attribute to <html> before hydration.
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          // Runs before first paint: lets CSS hold entrance-animated content hidden until
          // GSAP takes over, so server-rendered HTML doesn't flash. Skipped for reduced motion.
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('data-reveal-pending','')}catch(e){}",
          }}
        />
      </head>
      <body className={GeistSans.className}>
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgb(var(--muted))',
              border: '1px solid rgb(var(--border-strong))',
              color: 'rgb(var(--foreground))',
              fontSize: '0.8125rem',
              borderRadius: '10px',
              boxShadow: '0 16px 40px -12px rgb(0 0 0 / 0.7)',
            },
          }}
        />
      </body>
    </html>
  );
}
