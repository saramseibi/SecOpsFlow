'use client';

import React, { useState } from 'react';

import AppLogo from '@/components/ui/AppLogo';
import { Shield, Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

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

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
          ? detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join(' ')
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] flex-col justify-between bg-secondary border-r border-border p-10 relative overflow-hidden">
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow accent */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-critical/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <AppLogo size={32} />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-foreground tracking-tight">SecOpsFlow</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground leading-snug mb-3">
              Automated security scanning<br />on every commit.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Integrated scanners run automatically on every push, surfacing vulnerabilities across your repositories.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Shield, label: 'CVE detection across all dependencies' },
              { icon: Shield, label: 'Static analysis across your codebases' },
              { icon: Shield, label: 'Secrets and misconfiguration detection' },
              { icon: Shield, label: 'OWASP Top 10 coverage out of the box' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <item.icon size={13} className="text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <AppLogo size={28} />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-foreground">SecOpsFlow</span>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-7">
            <h2 className="text-xl font-semibold text-foreground mb-1">
              {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'signin'
                ? 'Welcome back — enter your credentials to continue.'
                : 'Get started — it only takes a minute.'}
            </p>
          </div>

          <div className="flex items-center bg-muted rounded-md p-0.5 mb-6">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-all duration-150 ${
                mode === 'signin' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-all duration-150 ${
                mode === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errors.form && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-critical/10 border border-critical/30 text-xs text-critical">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jane@company.com"
                  className={`w-full bg-input border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 ${
                    errors.email ? 'border-critical' : 'border-border'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-critical flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder={mode === 'signin' ? 'Enter your password' : 'At least 8 characters'}
                  className={`w-full bg-input border rounded-lg pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 ${
                    errors.password ? 'border-critical' : 'border-border'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-critical flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
