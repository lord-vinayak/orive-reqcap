import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshing: Promise<string | null> | null = null

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) {
        useAuthStore.getState().logout()
        return Promise.reject(error)
      }
      if (!refreshing) {
        refreshing = axios
          .post(`${API_URL}/api/auth/refresh/`, { refresh: refreshToken })
          .then((res) => {
            const newAccess = res.data.access as string
            useAuthStore.getState().setTokens(newAccess, refreshToken)
            return newAccess
          })
          .catch(() => {
            useAuthStore.getState().logout()
            return null
          })
          .finally(() => { refreshing = null })
      }
      const newToken = await refreshing
      if (!newToken) return Promise.reject(error)
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    }
    return Promise.reject(error)
  }
)
