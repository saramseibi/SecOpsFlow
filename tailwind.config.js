/** @type {import('tailwindcss').Config} */
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
        background: { DEFAULT: 'var(--background)' },
        foreground: { DEFAULT: 'var(--foreground)' },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        border: { DEFAULT: 'var(--border)' },
        input: { DEFAULT: 'var(--input)' },
        ring: { DEFAULT: 'var(--ring)' },
        critical: {
          DEFAULT: 'var(--critical)',
          bg: 'var(--critical-bg)',
          muted: 'var(--critical-muted)',
        },
        high: {
          DEFAULT: 'var(--high)',
          bg: 'var(--high-bg)',
          muted: 'var(--high-muted)',
        },
        medium: {
          DEFAULT: 'var(--medium)',
          bg: 'var(--medium-bg)',
          muted: 'var(--medium-muted)',
        },
        low: {
          DEFAULT: 'var(--low)',
          bg: 'var(--low-bg)',
          muted: 'var(--low-muted)',
        },
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          bg: 'var(--warning-bg)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg: 'var(--danger-bg)',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 2px)',
        lg: 'calc(var(--radius) + 2px)',
        xl: 'calc(var(--radius) + 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
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