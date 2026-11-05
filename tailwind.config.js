/** @type {import('tailwindcss').Config} */

// Tokens are stored as space-separated RGB channels (see src/styles/tailwind.css) so
// Tailwind's opacity modifiers (`bg-primary/10`, `border-critical/30`) actually compile.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        background: { DEFAULT: token('background') },
        shell: { DEFAULT: token('shell') },
        foreground: { DEFAULT: token('foreground') },
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
        },
        secondary: {
          DEFAULT: token('secondary'),
          foreground: token('secondary-foreground'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },
        card: {
          DEFAULT: token('card'),
          foreground: token('card-foreground'),
        },
        border: { DEFAULT: token('border'), strong: token('border-strong') },
        input: { DEFAULT: token('input') },
        ring: { DEFAULT: token('ring') },
        critical: { DEFAULT: token('critical') },
        high: { DEFAULT: token('high') },
        medium: { DEFAULT: token('medium') },
        low: { DEFAULT: token('low') },
        info: { DEFAULT: token('info') },
        success: { DEFAULT: token('success') },
        warning: { DEFAULT: token('warning') },
        danger: { DEFAULT: token('danger') },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgb(0 0 0 / 0.35)',
        xl: '0 12px 32px -8px rgb(0 0 0 / 0.6), 0 0 0 1px rgb(var(--border) / 0.6)',
        '2xl': '0 24px 64px -12px rgb(0 0 0 / 0.7), 0 0 0 1px rgb(var(--border) / 0.6)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-in-out',
        'slide-up': 'slideUp 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-highlight': 'pulseHighlight 600ms ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
