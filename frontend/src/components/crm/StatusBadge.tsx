import type { MilestoneStatus } from '@/types/crm'

interface StatusBadgeProps {
  hasDelays?: boolean
  status?: MilestoneStatus
}

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; classes: string }> = {
  on_track: { label: 'On Track', classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  at_risk: { label: 'At Risk', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  delayed: { label: 'Delayed', classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
}

export function StatusBadge({ hasDelays, status }: StatusBadgeProps) {
  if (status) {
    const { label, classes } = STATUS_CONFIG[status]
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes}`} aria-label={`Status: ${label}`}>
        {label}
      </span>
    )
  }
  if (hasDelays) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" aria-label="Project has delays">
        <span aria-hidden="true">🚩</span> Delayed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" aria-label="Project on track">
      On Track
    </span>
  )
}
