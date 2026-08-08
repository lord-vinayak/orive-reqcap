import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

// Mirrors TASK_REMINDER_SHOWN_KEY in hooks/useTaskReminders.ts — kept as a
// literal here (not imported) to avoid a store <-> hook circular import.
const TASK_REMINDER_SHOWN_KEY = 'taskReminderShown'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, access: string, refresh: string) => void
  setTokens: (access: string, refresh: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, access, refresh) =>
        set({ user, accessToken: access, refreshToken: refresh }),
      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      logout: () => {
        sessionStorage.removeItem(TASK_REMINDER_SHOWN_KEY)
        set({ user: null, accessToken: null, refreshToken: null })
      },
    }),
    { name: 'skinovation-auth' }
  )
)
