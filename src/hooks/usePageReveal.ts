'use client';

import type { RefObject } from 'react';
import { gsap, useGSAP, EASE_OUT, prefersReducedMotion, revealFailsafeFired } from '@/lib/motion';

/**
 * Staggered entrance for a page's top-level sections.
 *
 * GSAP only tweens one CSS variable (`--p`, 0 -> 1) on the layout-owned wrapper; the
 * per-section opacity/offset is derived from it in CSS (see `[data-revealing]` in
 * tailwind.css). Page content itself is never touched, so it is safe for sections that
 * hydrate later inside a <Suspense> boundary, and no transform is left behind afterwards.
 */
export function usePageReveal(scopeRef: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const el = scopeRef.current;
      const html = document.documentElement;
      // On a slow first load the CSS failsafe has already shown the content; re-hiding it
      // to animate would read as a flicker, so skip the entrance in that case.
      if (!el || prefersReducedMotion() || revealFailsafeFired()) {
        delete html.dataset.revealPending;
        return;
      }

      el.dataset.revealing = '';
      el.style.setProperty('--p', '0');
      // The pre-paint flag (set in the root layout) has done its job: the wrapper now holds
      // the hidden state, so the server-rendered HTML never flashes in and out.
      delete html.dataset.revealPending;

      const tween = gsap.to(el, {
        '--p': 1,
        duration: 0.5,
        ease: EASE_OUT,
        onComplete: () => {
          delete el.dataset.revealing;
          el.style.removeProperty('--p');
        },
      });
      return () => {
        tween.kill();
        delete el.dataset.revealing;
        el.style.removeProperty('--p');
      };
    },
    { scope: scopeRef }
  );
}
