import { useEffect } from 'react'
import { crmApi } from '@/services/crm'
import { useAuthStore } from '@/store/authStore'
import type { TaskItem } from '@/types/crm'

const REMINDER_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

// ponytail: reminds every hour for every open task, no per-task "seen" tracking —
// add a dismiss-until-changed flag if repeat popups turn out to be annoying
export function useTaskReminders(onReminder: (tasks: TaskItem[]) => void) {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return

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
      if (myOpenTasks.length) onReminder(myOpenTasks)
    }

    check().catch(() => {}) // best-effort — a failed reminder check shouldn't break the page
    const id = setInterval(() => check().catch(() => {}), REMINDER_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [user, onReminder])
}
