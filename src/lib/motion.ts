'use client';

import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
export const FULL_MOTION = '(prefers-reduced-motion: no-preference)';

export const EASE_OUT = 'power3.out';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION).matches;
}

export { gsap, useGSAP };

// Delay of the CSS `reveal-failsafe` animation in tailwind.css -- keep the two in sync.
export const REVEAL_FAILSAFE_MS = 1800;

/** True on a slow first load where the CSS failsafe has already revealed held content. */
export function revealFailsafeFired(): boolean {
  return (
    document.documentElement.dataset.revealPending !== undefined &&
    performance.now() > REVEAL_FAILSAFE_MS
  );
}
