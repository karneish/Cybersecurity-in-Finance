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
        gold: 'rgb(var(--gold) / <alpha-value>)',
        brand: {
          50: '#eef4ff',
          100: '#dce8ff',
          200: '#b9d4ff',
          300: '#8bb7ff',
          400: '#548ff7',
          500: '#2f6ee3',
          600: '#1e5aa8',
          700: '#174a8c',
          800: '#143c6f',
          900: '#12325c',
          950: '#0a1c34',
        },
        bg: {
          app: 'rgb(var(--bg-app) / <alpha-value>)',
          sidebar: 'rgb(var(--bg-sidebar) / <alpha-value>)',
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
          gold: 'rgb(var(--gold) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
          disabled: 'rgb(var(--text-disabled) / <alpha-value>)',
          inverse: 'rgb(var(--accent-contrast) / <alpha-value>)',
          gold: 'rgb(var(--gold) / <alpha-value>)',
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
        gold: '0 0 0 1px rgba(var(--gold), 0.35), 0 4px 14px rgba(var(--gold), 0.12)',
      },
    },
  },
  plugins: [],
}