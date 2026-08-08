import { useEffect } from 'react'
import { crmApi } from '@/services/crm'
import { useAuthStore } from '@/store/authStore'
import type { TaskItem } from '@/types/crm'

// Set once the reminder has been shown for the current login, so it doesn't
// re-fire on every page (Layout — and this hook with it — remounts on every
// navigation). Cleared on logout so the next login shows it fresh.
export const TASK_REMINDER_SHOWN_KEY = 'taskReminderShown'

export function useTaskReminders(onReminder: (tasks: TaskItem[]) => void) {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return
    if (sessionStorage.getItem(TASK_REMINDER_SHOWN_KEY)) return

    let cancelled = false
    const check = async () => {
      const [stage, standalone] = await Promise.all([
        crmApi.listTasks(),
        crmApi.listStandaloneTasks(),
      ])
      if (cancelled) return
      const myOpenTasks = [...stage.data.results, ...standalone.data.results].filter(
        (t) => t.assigned_to_user_id === user.id && t.task_status !== 'closed'
      )
      if (myOpenTasks.length) {
        onReminder(myOpenTasks)
        sessionStorage.setItem(TASK_REMINDER_SHOWN_KEY, '1')
      }
    }

    check().catch(() => {}) // best-effort — a failed reminder check shouldn't break the page
    return () => { cancelled = true }
  }, [user, onReminder])
}
