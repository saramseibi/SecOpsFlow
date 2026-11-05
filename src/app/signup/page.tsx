'use client';

import React, { useRef, useState } from 'react';

import AppLogo from '@/components/ui/AppLogo';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Package,
  Code2,
  KeyRound,
  ShieldCheck,
  LogIn,
  UserPlus,
  Check,
  ArrowBigUp,
} from 'lucide-react';
import { gsap, useGSAP, FULL_MOTION, EASE_OUT, revealFailsafeFired } from '@/lib/motion';

type Mode = 'signin' | 'signup';

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
}

const FEATURES = [
  { icon: Package, label: 'CVE detection across all dependencies' },
  { icon: Code2, label: 'Static analysis across your codebases' },
  { icon: KeyRound, label: 'Secrets and misconfiguration detection' },
  { icon: ShieldCheck, label: 'OWASP Top 10 coverage out of the box' },
];

const PIPELINE = ['SAST', 'SCA', 'Secrets', 'Tests', 'DAST'];

const MODE_COPY: Record<Mode, { title: string; description: string; icon: React.ElementType }> = {
  signin: {
    title: 'Sign in to your account',
    description: 'Welcome back — enter your credentials to continue.',
    icon: LogIn,
  },
  signup: {
    title: 'Create your account',
    description: 'Get started — it only takes a minute.',
    icon: UserPlus,
  },
};

// Guidance only -- the server's rule is just "at least 8 characters".
const STRENGTH = [
  { label: 'Too short', tone: 'var(--critical)' },
  { label: 'Weak', tone: 'var(--high)' },
  { label: 'Fair', tone: 'var(--medium)' },
  { label: 'Good', tone: 'var(--low)' },
  { label: 'Strong', tone: 'var(--success)' },
];

function passwordScore(pw: string): number {
  if (pw.length < 8) return 0;
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const inputClass = (hasError: boolean) =>
  `w-full h-11 bg-input/80 border rounded-lg pl-10 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary/70 focus:ring-4 focus:ring-primary/15 ${
    hasError ? 'border-critical/70' : 'border-border-strong hover:border-muted-foreground/40'
  }`;

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const firstModeRender = useRef(true);
  const spotlight = useRef<((x: number, y: number) => void) | null>(null);

  useGSAP(
    () => {
      if (revealFailsafeFired()) {
        delete document.documentElement.dataset.revealPending;
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(FULL_MOTION, () => {
        const tl = gsap.timeline({ defaults: { ease: EASE_OUT } });
        tl.from('[data-anim="brand"]', { autoAlpha: 0, y: 18, duration: 0.8, stagger: 0.08 })
          .from(
            '[data-anim="pipe"]',
            { autoAlpha: 0, scale: 0.85, duration: 0.45, stagger: 0.07 },
            '-=0.5'
          )
          .from('[data-anim="form"]', { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.06 }, 0.15);
        // GSAP now holds the hidden state inline; drop the pre-paint CSS hold (see layout.tsx).
        delete document.documentElement.dataset.revealPending;
      });
      return () => mm.revert();
    },
    { scope: rootRef }
  );

  // Cursor-following spotlight on the card (fine pointers with motion allowed only).
  useGSAP(
    () => {
      const card = cardRef.current;
      if (!card) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference) and (pointer: fine)', () => {
        const pos = { x: card.offsetWidth / 2, y: 0 };
        const write = () => {
          card.style.setProperty('--mx', `${pos.x}px`);
          card.style.setProperty('--my', `${pos.y}px`);
        };
        write();
        const toX = gsap.quickTo(pos, 'x', { duration: 0.45, ease: 'power3', onUpdate: write });
        const toY = gsap.quickTo(pos, 'y', { duration: 0.45, ease: 'power3', onUpdate: write });
        spotlight.current = (x, y) => {
          toX(x);
          toY(y);
        };
        return () => {
          spotlight.current = null;
        };
      });
      return () => mm.revert();
    },
    { scope: cardRef }
  );

  // Crossfade the copy that changes when switching between sign in and sign up.
  useGSAP(
    () => {
      if (firstModeRender.current) {
        firstModeRender.current = false;
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(FULL_MOTION, () => {
        gsap.from('[data-swap]', {
          autoAlpha: 0,
          y: 6,
          duration: 0.35,
          ease: EASE_OUT,
          stagger: 0.04,
          clearProps: 'opacity,visibility,transform',
        });
      });
      return () => mm.revert();
    },
    { scope: cardRef, dependencies: [mode] }
  );

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!form.password) {
      newErrors.password = 'Password is required.';
    } else if (mode === 'signup' && form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const detail = data?.detail;
        const message = Array.isArray(detail)
          ? detail
              .map((d: { msg?: string }) => d?.msg)
              .filter(Boolean)
              .join(' ')
          : typeof detail === 'string'
            ? detail
            : mode === 'signup'
              ? 'Could not create your account.'
              : 'Could not sign you in.';
        setErrors({ form: message });
        return;
      }

      // A hard navigation, not router.push, so the Dashboard's client-side state (and
      // Next's Router Cache) can't carry the previous user's already-fetched data over --
      // router.refresh() only re-fetches server-rendered data, it never resets a 'use
      // client' page's own useEffect-driven fetches or component state.
      window.location.href = '/';
    } catch {
      setErrors({ form: 'Unable to reach the server. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState?.('CapsLock') ?? false);
  };

  const handleCardPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!spotlight.current || !cardRef.current) return;
    const box = cardRef.current.getBoundingClientRect();
    spotlight.current(e.clientX - box.left, e.clientY - box.top);
  };

  const copy = MODE_COPY[mode];
  const ModeIcon = copy.icon;
  const score = passwordScore(form.password);
  const strength = STRENGTH[score];

  return (
    <div ref={rootRef} className="min-h-[100dvh] bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[46%] flex-col justify-between gap-8 bg-secondary border-r border-border p-10 xl:p-14 [@media(max-height:900px)]:py-8 relative overflow-hidden">
        {/* Grid overlay, masked to fade toward the bottom */}
        <div
          aria-hidden="true"
          className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black_20%,transparent_70%)]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(var(--border) / 0.7) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--border) / 0.7) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        {/* Glow accents */}
        <div
          aria-hidden="true"
          className="absolute -top-40 -left-24 w-[34rem] h-[34rem] rounded-full bg-primary/[0.12] blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-48 -right-24 w-[28rem] h-[28rem] rounded-full bg-[rgb(56_214_245/0.07)] blur-3xl pointer-events-none"
        />

        <div data-anim="brand" className="relative z-10 flex items-center gap-2">
          <AppLogo size={48} className="-my-2 -ml-2" />
          <span className="text-base font-semibold text-foreground tracking-tight">
            SecOps<span className="text-brand">Flow</span>
          </span>
        </div>

        <div className="relative z-10 space-y-10 [@media(max-height:900px)]:space-y-7 max-w-lg">
          <div>
            <p data-anim="brand" className="eyebrow mb-4 !text-primary/90">
              DevSecOps · Vulnerability intelligence
            </p>
            <h1
              data-anim="brand"
              className="text-[2.5rem] xl:text-5xl font-semibold text-foreground leading-[1.05] tracking-[-0.035em] mb-5"
            >
              Automated security scanning <span className="text-brand">on every commit.</span>
            </h1>
            <p
              data-anim="brand"
              className="text-[15px] text-muted-foreground leading-relaxed max-w-md"
            >
              Integrated scanners run automatically on every push, surfacing vulnerabilities across
              your repositories.
            </p>
          </div>

          {/* Pipeline motif */}
          <div
            data-anim="brand"
            className="flex items-center flex-wrap gap-y-2"
            aria-label="Scan stages"
          >
            {PIPELINE.map((stage, i) => (
              <React.Fragment key={stage}>
                <span
                  data-anim="pipe"
                  className="font-mono text-[11px] px-2.5 py-1 rounded-md border border-border-strong bg-card/80 text-foreground/85"
                >
                  {stage}
                </span>
                {i < PIPELINE.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="w-5 h-px bg-gradient-to-r from-border-strong to-primary/50"
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <ul className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {FEATURES.map((item) => (
              <li
                key={item.label}
                data-anim="brand"
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/40 backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <item.icon size={15} className="text-primary" strokeWidth={1.9} />
                </div>
                <span className="text-[13px] text-foreground/80 leading-snug pt-1.5">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p
          data-anim="brand"
          className="relative z-10 font-mono text-[11px] text-muted-foreground/70"
        >
          GitHub Actions · SAST · SCA · Secrets · DAST
        </p>
      </div>

      {/* Right panel — form */}
      <main className="flex-1 flex flex-col min-h-[100dvh] relative overflow-hidden">
        {/* Ambient backdrop: dot grid fading out from the center, plus two soft glows */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(ellipse_60%_55%_at_50%_45%,black,transparent)]"
          style={{
            backgroundImage: 'radial-gradient(rgb(var(--foreground) / 0.07) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] max-w-[120vw] rounded-full bg-primary/[0.09] blur-[110px] pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute right-[-10rem] bottom-[-12rem] w-[26rem] h-[26rem] rounded-full bg-[rgb(56_214_245/0.06)] blur-[100px] pointer-events-none"
        />

        {/* `my-auto` (not justify-center) centers the form when it fits and falls back to
            normal flow when it doesn't, so the card's top is never pushed off-screen. */}
        <div className="relative flex-1 flex flex-col px-5 sm:px-10 py-10 sm:py-14">
          <div className="w-full max-w-[440px] mx-auto my-auto">
            {/* Mobile logo */}
            <div
              data-anim="form"
              className="lg:hidden flex items-center justify-center gap-1.5 mb-8"
            >
              <AppLogo size={44} className="-my-2" />
              <span className="text-base font-semibold text-foreground tracking-tight">
                SecOps<span className="text-brand">Flow</span>
              </span>
            </div>

            {/* Card */}
            <div
              data-anim="form"
              ref={cardRef}
              onPointerMove={handleCardPointer}
              className="group/card relative w-full rounded-2xl bg-card/70 backdrop-blur-xl ring-1 ring-border-strong shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.05)] px-6 py-7 sm:px-9 sm:py-9"
            >
              {/* Top edge highlight */}
              <span
                aria-hidden="true"
                className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
              />
              {/* Cursor spotlight: soft fill + brighter border ring */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    'radial-gradient(420px circle at var(--mx, 50%) var(--my, 0px), rgb(var(--primary) / 0.08), transparent 60%)',
                }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl p-px opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    'radial-gradient(240px circle at var(--mx, 50%) var(--my, 0px), rgb(var(--primary) / 0.7), transparent 70%)',
                  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />

              <div className="relative">
                {/* Header */}
                <div className="mb-7">
                  <div
                    data-swap
                    className="w-11 h-11 mb-5 rounded-xl flex items-center justify-center bg-gradient-to-b from-primary/25 to-primary/5 ring-1 ring-primary/30 shadow-[0_8px_24px_-8px_rgb(var(--primary)/0.6)]"
                  >
                    <ModeIcon size={19} className="text-primary" strokeWidth={1.9} />
                  </div>
                  <h2
                    data-swap
                    className="text-2xl font-semibold text-foreground tracking-tight mb-1.5"
                  >
                    {copy.title}
                  </h2>
                  <p data-swap className="text-sm text-muted-foreground">
                    {copy.description}
                  </p>
                </div>

                {/* Mode toggle with sliding indicator */}
                <div
                  role="group"
                  aria-label="Authentication mode"
                  className="relative grid grid-cols-2 bg-input/80 border border-border rounded-lg p-1 mb-6"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-md bg-muted border border-border-strong shadow-sm transition-transform duration-300 ease-out ${
                      mode === 'signup' ? 'translate-x-full' : 'translate-x-0'
                    }`}
                  />
                  <button
                    type="button"
                    aria-pressed={mode === 'signin'}
                    onClick={() => switchMode('signin')}
                    className={`relative py-2 text-[13px] font-medium rounded-md transition-colors duration-150 ${
                      mode === 'signin'
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === 'signup'}
                    onClick={() => switchMode('signup')}
                    className={`relative py-2 text-[13px] font-medium rounded-md transition-colors duration-150 ${
                      mode === 'signup'
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {errors.form && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-critical/10 border border-critical/30 text-[13px] text-critical slide-up"
                    >
                      <AlertCircle size={15} className="flex-shrink-0 mt-px" />
                      <span>{errors.form}</span>
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-[13px] font-medium text-foreground/85 mb-2"
                    >
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="jane@company.com"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        className={`${inputClass(!!errors.email)} pr-3`}
                      />
                    </div>
                    {errors.email && (
                      <p
                        id="email-error"
                        className="mt-1.5 text-xs text-critical flex items-center gap-1"
                      >
                        <AlertCircle size={11} /> {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-[13px] font-medium text-foreground/85 mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                        value={form.password}
                        onChange={handleChange}
                        onKeyDown={handlePasswordKey}
                        onKeyUp={handlePasswordKey}
                        onBlur={() => setCapsLock(false)}
                        placeholder={
                          mode === 'signin' ? 'Enter your password' : 'At least 8 characters'
                        }
                        aria-invalid={!!errors.password}
                        aria-describedby={
                          [
                            errors.password && 'password-error',
                            capsLock && 'caps-warning',
                            mode === 'signup' && 'password-strength',
                          ]
                            .filter(Boolean)
                            .join(' ') || undefined
                        }
                        className={`${inputClass(!!errors.password)} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {capsLock && (
                      <p
                        id="caps-warning"
                        className="mt-1.5 text-xs text-warning flex items-center gap-1 fade-in"
                      >
                        <ArrowBigUp size={13} /> Caps Lock is on
                      </p>
                    )}
                    {errors.password && (
                      <p
                        id="password-error"
                        className="mt-1.5 text-xs text-critical flex items-center gap-1"
                      >
                        <AlertCircle size={11} /> {errors.password}
                      </p>
                    )}

                    {/* Strength meter (sign up only) */}
                    {mode === 'signup' && (
                      <div id="password-strength" className="mt-3 slide-up" aria-live="polite">
                        <div className="flex gap-1.5" aria-hidden="true">
                          {[1, 2, 3, 4].map((seg) => (
                            <span
                              key={seg}
                              className="h-1 flex-1 rounded-full bg-muted overflow-hidden"
                            >
                              <span
                                className="block h-full rounded-full transition-[width,background-color] duration-300 ease-out"
                                style={{
                                  width:
                                    form.password && (score >= seg || (score === 0 && seg === 1))
                                      ? '100%'
                                      : '0%',
                                  backgroundColor: `rgb(${strength.tone})`,
                                }}
                              />
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11.5px]">
                          <span
                            className={`flex items-center gap-1.5 transition-colors ${
                              form.password.length >= 8 ? 'text-success' : 'text-muted-foreground'
                            }`}
                          >
                            <Check size={12} strokeWidth={2.5} />
                            At least 8 characters
                          </span>
                          {form.password && (
                            <span className="font-mono" style={{ color: `rgb(${strength.tone})` }}>
                              {strength.label}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary group w-full justify-center !h-11 !text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[rgb(var(--primary-foreground)/0.3)] border-t-[rgb(var(--primary-foreground))] rounded-full animate-spin" />
                        {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                      </>
                    ) : (
                      <span data-swap className="inline-flex items-center gap-1.5">
                        {mode === 'signin' ? 'Sign In' : 'Create Account'}
                        <ArrowRight
                          size={15}
                          className="transition-transform duration-200 group-hover:translate-x-0.5"
                        />
                      </span>
                    )}
                  </button>
                </form>

                {/* Alternate mode */}
                <p className="mt-6 pt-5 border-t border-border text-center text-[13px] text-muted-foreground">
                  {mode === 'signin' ? 'New to SecOpsFlow?' : 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="font-medium text-primary hover:text-foreground underline-offset-4 hover:underline transition-colors"
                  >
                    {mode === 'signin' ? 'Create an account' : 'Sign in instead'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
