/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        risk: {
          critical: 'rgb(var(--status-critical) / <alpha-value>)',
          high: 'rgb(var(--status-high) / <alpha-value>)',
          medium: 'rgb(var(--status-medium) / <alpha-value>)',
          low: 'rgb(var(--status-low) / <alpha-value>)',
        },
        brand: {
          50: '#f0f4fa',
          100: '#e0e9f5',
          200: '#c2d3ea',
          300: '#9bb5d8',
          400: '#6a8fc2',
          500: '#40689f',
          600: '#1b3a6b',
          700: '#152c52',
          800: '#10213f',
          900: '#0c1930',
          950: '#0a1425',
        },
        bg: {
          app: 'rgb(var(--bg-app) / <alpha-value>)',
          masthead: 'rgb(var(--bg-masthead) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
          hover: 'rgb(var(--bg-hover) / <alpha-value>)',
          input: 'rgb(var(--bg-input) / <alpha-value>)',
        },
        surface: {
          2: 'rgb(var(--bg-surface-2) / <alpha-value>)',
        },
        border: {
          default: 'rgb(var(--border-default) / <alpha-value>)',
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
          active: 'rgb(var(--border-active) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
          disabled: 'rgb(var(--text-disabled) / <alpha-value>)',
          inverse: 'rgb(var(--accent-contrast) / <alpha-value>)',
        },
        accent: {
          primary: 'rgb(var(--accent-primary) / <alpha-value>)',
          secondary: 'rgb(var(--accent-secondary) / <alpha-value>)',
        },
        status: {
          critical: 'rgb(var(--status-critical) / <alpha-value>)',
          high: 'rgb(var(--status-high) / <alpha-value>)',
          medium: 'rgb(var(--status-medium) / <alpha-value>)',
          low: 'rgb(var(--status-low) / <alpha-value>)',
          info: 'rgb(var(--status-info) / <alpha-value>)',
          live: 'rgb(var(--status-live) / <alpha-value>)',
        },
      },
      borderRadius: {
        card: '12px',
        panel: '8px',
        input: '6px',
        button: '6px',
        modal: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,31,55,0.04), 0 4px 12px rgba(15,31,55,0.05)',
        modal: '0 12px 40px rgba(15,31,55,0.18)',
        'card-dark': '0 1px 2px rgba(0,0,0,0.35), 0 6px 18px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
}