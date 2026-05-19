import { api } from './api'
import type { User } from '@/types'

export interface AuthResponse {
  access: string
  refresh: string
  user: User
}

export const authService = {
  loginWithPassword: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/login/', { email, password })
    return data
  },
  loginWithGoogle: async (idToken: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/google/', { id_token: idToken })
    return data
  },
  me: async (): Promise<User> => {
    const { data } = await api.get('/auth/me/')
    return data
  },
}
