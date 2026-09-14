import { describe, it, expect } from 'vitest'
import { hasAccess, getAccessiblePages, getDefaultRoute } from './roles'

describe('roles config', () => {
  it('grants VIEWER access to public pages only', () => {
    expect(hasAccess('VIEWER', 'VIEWER')).toBe(true)
    expect(hasAccess('VIEWER', 'ANALYST')).toBe(false)
    expect(hasAccess('VIEWER', 'CISO')).toBe(false)
    expect(hasAccess('VIEWER', 'ADMIN')).toBe(false)
  })

  it('gives ADMIN access to every page', () => {
    for (const page of ['VIEWER', 'ANALYST', 'CISO', 'ADMIN'] as const) {
      expect(hasAccess('ADMIN', page)).toBe(true)
    }
  })

  it('denies ANALYST the strategy and admin pages', () => {
    expect(hasAccess('ANALYST', 'CISO')).toBe(false)
    expect(hasAccess('ANALYST', 'ADMIN')).toBe(false)
    expect(hasAccess('ANALYST', 'ANALYST')).toBe(true)
    expect(hasAccess('ANALYST', 'VIEWER')).toBe(true)
  })

  it('denies CISO the admin settings page', () => {
    expect(hasAccess('CISO', 'ADMIN')).toBe(false)
    expect(hasAccess('CISO', 'CISO')).toBe(true)
  })

  it('filters accessible pages per role', () => {
    const viewerPages = getAccessiblePages('VIEWER').map((p) => p.path)
    expect(viewerPages).toEqual(['/', '/risk'])

    const analystPages = getAccessiblePages('ANALYST').map((p) => p.path)
    expect(analystPages).toContain('/security')
    expect(analystPages).toContain('/vulnerabilities')
    expect(analystPages).not.toContain('/investment')
    expect(analystPages).not.toContain('/national')
    expect(analystPages).not.toContain('/settings')

    const adminPages = getAccessiblePages('ADMIN').map((p) => p.path)
    expect(adminPages).toContain('/settings')
    expect(adminPages).toHaveLength(10)
  })

  it('defaults unknown roles to the public route', () => {
    expect(getDefaultRoute(undefined)).toBe('/')
    expect(getDefaultRoute(null)).toBe('/')
  })

  it('returns a page every role can reach', () => {
    expect(getDefaultRoute('ADMIN')).toBe('/')
    expect(getDefaultRoute('CISO')).toBe('/')
    expect(getDefaultRoute('ANALYST')).toBe('/')
    expect(getDefaultRoute('VIEWER')).toBe('/')
  })
})