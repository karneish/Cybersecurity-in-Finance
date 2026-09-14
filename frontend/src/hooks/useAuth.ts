import { useAuthStore } from '../store/authStore'
import type { User } from '../types/api'

const ROLE_HIERARCHY: Record<User['role'], number> = {
  ADMIN: 4,
  CISO: 3,
  ANALYST: 2,
  VIEWER: 1,
}

export function useAuth() {
  const { token, user, isAuthenticated, loading, error, login, logout, initialize } = useAuthStore()

  const isAllowed = (requiredRole: User['role']) => {
    if (!user) return false
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole]
  }

  return {
    token,
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    initialize,
    isAllowed,
  }
}
