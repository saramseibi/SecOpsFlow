'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  const handleGoHome = () => {
    router?.push('/');
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history?.back();
    }
  };

  return (
    <main className="app-canvas min-h-[100dvh] flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        <p className="eyebrow !text-primary mb-4">Error 404</p>
        <h1 className="text-[clamp(5rem,18vw,8rem)] font-semibold leading-none tracking-[-0.06em] text-brand mb-6 select-none">
          404
        </h1>

        <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
          Page Not Found
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist. Let&apos;s get you back!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={handleGoBack} className="btn-ghost justify-center">
            <ArrowLeft size={15} />
            Go Back
          </button>

          <button onClick={handleGoHome} className="btn-primary justify-center">
            <Home size={15} />
            Back to Home
          </button>
        </div>
      </div>
    </main>
  );
}
