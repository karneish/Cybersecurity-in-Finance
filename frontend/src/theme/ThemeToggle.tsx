import { Moon, Sun } from 'lucide-react'
import { useTheme } from './useTheme'
import { clsx } from 'clsx'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={clsx(
        'relative flex h-8 w-16 items-center rounded-full border px-1 transition-colors duration-200',
        isDark
          ? 'border-border-default bg-bg-elevated'
          : 'border-border-default bg-bg-elevated',
      )}
    >
      <span
        className={clsx(
          'flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-transform duration-200',
          isDark
            ? 'translate-x-8 bg-gold text-[#fff7e0]'
            : 'translate-x-0 bg-accent-primary text-white',
        )}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
      <Sun className="absolute right-1.5 h-3 w-3 text-text-tertiary" />
      <Moon className="absolute left-1.5 h-3 w-3 text-text-tertiary" />
    </button>
  )
}