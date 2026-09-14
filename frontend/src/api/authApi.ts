import apiClient from './client'
import type { LoginResponse, User } from '../types/api'

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { username, password }),

  register: (data: { username: string; email: string; password: string; full_name: string; role: string }) =>
    apiClient.post<LoginResponse>('/auth/register', data),

  getMe: () => apiClient.get<User>('/auth/me'),
}
