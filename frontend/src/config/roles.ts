import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Shield,
  AlertTriangle,
  Server,
  Bug,
  LineChart,
  Bot,
  DollarSign,
  Landmark,
  Settings,
} from 'lucide-react'
import type { User } from '@/types/api'

type Role = User['role']

export interface PageAccess {
  path: string
  label: string
  icon: LucideIcon
  group: 'Operations' | 'Analysis' | 'Strategy' | 'System'
  minRole: Role
}

export const ROLE_HIERARCHY: Role[] = ['ADMIN', 'CISO', 'ANALYST', 'VIEWER']

export const PAGE_ACCESS: PageAccess[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Operations', minRole: 'VIEWER' },
  { path: '/security', label: 'Security', icon: Shield, group: 'Operations', minRole: 'ANALYST' },
  { path: '/assets', label: 'Assets', icon: Server, group: 'Operations', minRole: 'ANALYST' },
  { path: '/risk', label: 'Risk Analysis', icon: AlertTriangle, group: 'Analysis', minRole: 'VIEWER' },
  { path: '/vulnerabilities', label: 'Vulnerabilities', icon: Bug, group: 'Analysis', minRole: 'ANALYST' },
  { path: '/simulator', label: 'Simulator', icon: LineChart, group: 'Analysis', minRole: 'ANALYST' },
  { path: '/investment', label: 'Investment', icon: DollarSign, group: 'Strategy', minRole: 'CISO' },
  { path: '/national', label: 'National Observatory', icon: Landmark, group: 'Strategy', minRole: 'CISO' },
  { path: '/ai', label: 'AI Assistant', icon: Bot, group: 'Strategy', minRole: 'ANALYST' },
  { path: '/settings', label: 'Settings', icon: Settings, group: 'System', minRole: 'ADMIN' },
]

export function hasAccess(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) <= ROLE_HIERARCHY.indexOf(minRole)
}

export function getAccessiblePages(role: Role): PageAccess[] {
  return PAGE_ACCESS.filter((page) => hasAccess(role, page.minRole))
}

export function getDefaultRoute(role?: Role | null): string {
  const pages = getAccessiblePages(role ?? 'VIEWER')
  if (pages.length === 0) return '/'
  return pages[0].path
}