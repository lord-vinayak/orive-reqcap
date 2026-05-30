import { useState } from 'react'
import { crmApi } from '@/services/crm'
import type { ProjectMilestone } from '@/types/crm'
import { StatusBadge } from './StatusBadge'

interface MilestoneTableProps {
  milestones: ProjectMilestone[]
  projectId: string
  onRefresh: () => void
}

export function MilestoneTable({ milestones, projectId, onRefresh }: MilestoneTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [actualDate, setActualDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async (milestoneId: string) => {
    if (!actualDate) return
    setSaving(true)
    await crmApi.updateMilestoneActualDate(milestoneId, actualDate)
    setEditingId(null)
    setActualDate('')
    setSaving(false)
    onRefresh()
  }

  return (
    <section aria-labelledby="milestones-heading" className="bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg p-4">
      <h2 id="milestones-heading" className="font-semibold text-black dark:text-white mb-3 text-sm">Timeline Milestones</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" aria-label="Project milestones and their status">
          <thead>
            <tr className="text-left border-b border-black/10 dark:border-white/10">
              <th scope="col" className="pb-2 font-semibold text-black/60 dark:text-slate-400">Milestone</th>
              <th scope="col" className="pb-2 font-semibold text-black/60 dark:text-slate-400">Planned</th>
              <th scope="col" className="pb-2 font-semibold text-black/60 dark:text-slate-400">Actual</th>
              <th scope="col" className="pb-2 font-semibold text-black/60 dark:text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {milestones.map((m) => (
              <tr key={m.id}>
                <td className="py-2 pr-2 text-black dark:text-white">{m.milestone_display}</td>
                <td className="py-2 pr-2 text-black/60 dark:text-slate-400">{m.planned_date}</td>
                <td className="py-2 pr-2">
                  {editingId === m.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={actualDate}
                        onChange={(e) => setActualDate(e.target.value)}
                        className="border border-mustard rounded px-1 py-0.5 text-xs bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-mustard"
                        aria-label={`Actual completion date for ${m.milestone_display}`}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSave(m.id)}
                        disabled={saving || !actualDate}
                        className="text-mustard hover:underline focus-visible:ring-1 focus-visible:ring-mustard"
                        aria-label="Save actual date"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setActualDate('') }}
                        className="text-black/40 hover:text-black dark:hover:text-white focus-visible:ring-1 focus-visible:ring-mustard"
                        aria-label="Cancel editing"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(m.id); setActualDate(m.actual_date ?? '') }}
                      className="text-black/60 dark:text-slate-400 hover:text-mustard focus-visible:ring-1 focus-visible:ring-mustard rounded"
                      aria-label={`${m.actual_date ? `Edit actual date: ${m.actual_date}` : `Set actual completion date for ${m.milestone_display}`}`}
                    >
                      {m.actual_date || <span className="text-black/30 dark:text-slate-600">Set date</span>}
                    </button>
                  )}
                </td>
                <td className="py-2">
                  <StatusBadge status={m.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
