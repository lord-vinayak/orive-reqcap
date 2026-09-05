import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { emitToast } from '@/lib/toastBus'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const { accessToken, user } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  const method = (config.method || 'get').toLowerCase()
  if (user?.role === 'auditor' && method !== 'get') {
    emitToast('Auditor accounts are read-only — changes are not saved.')
    return Promise.reject({ __auditorBlocked: true, config })
  }
  return config
})

let refreshing: Promise<string | null> | null = null

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    // __auditorBlocked rejections (see request interceptor) have no error.response,
    // so this check naturally skips them and falls through to the final reject.
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
