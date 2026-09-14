import { create } from 'zustand'
import type { User } from '../types/api'
import { authApi } from '../api/authApi'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const response = await authApi.login(username, password)
      const { token, user } = response.data
      localStorage.setItem('token', token)
      set({ token, user, isAuthenticated: true, loading: false })
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Login failed'
      set({ error: message, loading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null, isAuthenticated: false, error: null })
  },

  initialize: async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    set({ loading: true })
    try {
      const response = await authApi.getMe()
      set({ token, user: response.data, isAuthenticated: true, loading: false })
    } catch {
      localStorage.removeItem('token')
      set({ token: null, user: null, isAuthenticated: false, loading: false })
    }
  },
}))
