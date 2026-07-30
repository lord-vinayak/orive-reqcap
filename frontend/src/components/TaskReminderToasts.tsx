import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useTaskReminders } from '@/hooks/useTaskReminders'
import type { TaskItem } from '@/types/crm'

const AUTO_DISMISS_MS = 8000

export default function TaskReminderToasts() {
  const [toasts, setToasts] = useState<TaskItem[]>([])
  const navigate = useNavigate()

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const onReminder = useCallback((tasks: TaskItem[]) => {
    setToasts(tasks)
    tasks.forEach((t) => setTimeout(() => dismiss(t.id), AUTO_DISMISS_MS))
  }, [dismiss])

  useTaskReminders(onReminder)

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-80"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 shadow-lg p-3 cursor-pointer"
            onClick={() => { dismiss(t.id); navigate('/tasks') }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-black dark:text-white">
                {t.title || t.stage_display || 'Task'}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(t.id) }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 leading-none"
                aria-label="Dismiss reminder"
              >×</button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t.client_name ? `${t.client_name} — ` : ''}{t.task_status_display}
              {t.planned_closure_date ? ` · Due ${new Date(t.planned_closure_date).toLocaleDateString('en-IN')}` : ''}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
