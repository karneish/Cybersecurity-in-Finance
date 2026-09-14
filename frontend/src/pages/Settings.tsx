import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/theme/useTheme'
import { User, Bell, Palette, Code, Info } from 'lucide-react'
import { clsx } from 'clsx'

type Section = 'profile' | 'notifications' | 'theme' | 'api' | 'about'

export default function Settings() {
  const { user } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [activeSection, setActiveSection] = useState<Section>('profile')
  const [wsEnabled, setWsEnabled] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(false)

  const sections: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { key: 'theme', label: 'Theme', icon: <Palette className="h-4 w-4" /> },
    { key: 'api', label: 'API Configuration', icon: <Code className="h-4 w-4" /> },
    { key: 'about', label: 'About', icon: <Info className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <nav className="cyber-card p-2">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={clsx(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeSection === s.key
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              )}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>

        <div className="lg:col-span-3">
          {activeSection === 'profile' && (
            <div className="cyber-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">Profile</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
                    {user?.full_name?.charAt(0) ?? 'U'}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-text-primary">{user?.full_name}</p>
                    <p className="text-sm text-text-tertiary">{user?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">Full Name</label>
                    <input
                      type="text"
                      defaultValue={user?.full_name}
                      className="cyber-input w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">Email</label>
                    <input
                      type="email"
                      defaultValue={user?.email}
                      className="cyber-input w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">Username</label>
                    <input
                      type="text"
                      defaultValue={user?.username}
                      disabled
                      className="w-full rounded-lg border border-border-default bg-bg-hover px-3 py-2 text-sm text-text-tertiary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">Role</label>
                    <input
                      type="text"
                      defaultValue={user?.role}
                      disabled
                      className="w-full rounded-lg border border-border-default bg-bg-hover px-3 py-2 text-sm text-text-tertiary"
                    />
                  </div>
                </div>
                <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="cyber-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">Notifications</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border-subtle p-4">
                  <div>
                    <p className="text-sm font-medium text-text-primary">WebSocket Real-time Alerts</p>
                    <p className="text-xs text-text-tertiary">Receive real-time security event notifications</p>
                  </div>
                  <button
                    onClick={() => setWsEnabled(!wsEnabled)}
                    className={clsx(
                      'relative h-6 w-11 rounded-full transition-colors',
                      wsEnabled ? 'bg-brand-600' : 'bg-bg-hover'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                        wsEnabled && 'translate-x-5'
                      )}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border-subtle p-4">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Email Alerts</p>
                    <p className="text-xs text-text-tertiary">Get email notifications for critical events</p>
                  </div>
                  <button
                    onClick={() => setEmailAlerts(!emailAlerts)}
                    className={clsx(
                      'relative h-6 w-11 rounded-full transition-colors',
                      emailAlerts ? 'bg-brand-600' : 'bg-bg-hover'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                        emailAlerts && 'translate-x-5'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'theme' && (
            <div className="cyber-card p-6">
              <h2 className="mb-1 text-lg font-semibold text-text-primary">Theme</h2>
              <p className="mb-4 text-xs text-text-tertiary">
                Colour scheme applies across the observatory and persists between sessions.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={clsx(
                    'flex-1 rounded-xl border-2 p-4 text-center transition-colors',
                    theme === 'light' ? 'border-gold bg-gold/10' : 'border-border-default hover:border-border-subtle'
                  )}
                >
                  <div className="mx-auto mb-2 flex h-12 w-20 items-center justify-center rounded-lg border border-border-subtle bg-bg-app shadow-sm">
                    <Palette className="h-6 w-6 text-text-secondary" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={clsx(
                    'flex-1 rounded-xl border-2 p-4 text-center transition-colors',
                    theme === 'dark' ? 'border-gold bg-gold/10' : 'border-border-default hover:border-border-subtle'
                  )}
                >
                  <div className="mx-auto mb-2 flex h-12 w-20 items-center justify-center rounded-lg border border-border-subtle bg-[#070C16] shadow-sm">
                    <Palette className="h-6 w-6 text-[#E6C168]" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">Dark</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'api' && (
            <div className="cyber-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">API Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">
                    API Base URL
                  </label>
                  <input
                    type="text"
                    value={import.meta.env.VITE_API_BASE_URL || '/api'}
                    disabled
                    className="w-full rounded-lg border border-border-default bg-bg-hover px-3 py-2 font-mono text-sm text-text-tertiary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">
                    WebSocket URL
                  </label>
                  <input
                    type="text"
                    value={`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`}
                    disabled
                    className="w-full rounded-lg border border-border-default bg-bg-hover px-3 py-2 font-mono text-sm text-text-tertiary"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="cyber-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">About</h2>
              <div className="space-y-3 text-sm text-text-secondary">
                <div className="flex justify-between rounded-lg bg-bg-elevated px-4 py-3">
                  <span>Application</span>
                  <span className="font-medium text-text-primary">CyberRisk Quantifier</span>
                </div>
                <div className="flex justify-between rounded-lg bg-bg-elevated px-4 py-3">
                  <span>Version</span>
                  <span className="font-medium text-text-primary">0.1.0</span>
                </div>
                <div className="flex justify-between rounded-lg bg-bg-elevated px-4 py-3">
                  <span>Framework</span>
                  <span className="font-medium text-text-primary">React 18 + TypeScript</span>
                </div>
                <div className="flex justify-between rounded-lg bg-bg-elevated px-4 py-3">
                  <span>Build</span>
                  <span className="font-medium text-text-primary">Vite 5</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
