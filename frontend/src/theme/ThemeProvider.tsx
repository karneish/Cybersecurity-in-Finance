import { type ReactNode } from 'react'
import { ThemeContext, type Theme } from './useTheme'

const LIGHT: Theme = 'light'

export function ThemeProvider({ children }: { children: ReactNode }) {
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    root.removeAttribute('data-theme')
    root.style.colorScheme = LIGHT
  }

  return (
    <ThemeContext.Provider value={{ theme: LIGHT, setTheme: () => {}, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  )
}

export type { Theme } from './useTheme'