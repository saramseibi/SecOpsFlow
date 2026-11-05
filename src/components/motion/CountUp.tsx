'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/motion';

interface CountUpProps {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  className?: string;
}

// Client navigation keeps this module loaded, so the flag lasts for the browser session.
let introPlayed = false;

/** Animates a number from its previous value to `value`. The count-up from 0 on mount
 * plays only on the first page of a session; later mounts show the value directly, while
 * a value that changes in place still animates. Reduced motion always skips the tween. */
export default function CountUp({
  value,
  decimals = 0,
  suffix = '',
  duration = 0.8,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef({ n: 0 });
  const mounted = useRef(false);

  const format = (n: number) =>
    `${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const isMount = !mounted.current;
    mounted.current = true;
    if (prefersReducedMotion() || (isMount && introPlayed)) {
      shown.current.n = value;
      el.textContent = format(value);
      return;
    }
    // Paint the starting value before the first frame so the final number never flashes.
    el.textContent = format(shown.current.n);
    const tween = gsap.to(shown.current, {
      n: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = format(shown.current.n);
      },
      onComplete: () => {
        introPlayed = true;
      },
    });
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals, suffix, duration]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
