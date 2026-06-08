import { useState, useRef, useEffect, type CSSProperties } from 'react'
import type { StageStatusItem, InternalTeamMember, TaskStatus } from '@/types/crm'
import { TASK_STATUS_LABELS as STATUS_LABELS } from '@/types/crm'

interface Props {
  stage: StageStatusItem
  onToggle: (key: string, complete: boolean) => void
  saving?: boolean
  teamMembers?: InternalTeamMember[]
  onAssign?: (key: string, memberId: string, comment?: string) => Promise<void>
}

export function StageCheckbox({ stage, onToggle, saving, teamMembers = [], onAssign }: Props) {
  const isDisabled = stage.is_locked || saving
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({})
  const [search, setSearch] = useState('')
  const [assigning, setAssigning] = useState(false)
  // Two-step assign: null = pick member, non-null = confirm + comment
  const [selectedMember, setSelectedMember] = useState<InternalTeamMember | null>(null)
  const [comment, setComment] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const closePopover = () => {
    setPopoverOpen(false)
    setSearch('')
    setSelectedMember(null)
    setComment('')
    triggerRef.current?.focus()
  }

  const openPopover = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      // Anchor fixed popover to bottom-right of trigger button
      setPopoverStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
        width: '16rem',
      })
    }
    setPopoverOpen((v) => !v)
    setSearch('')
  }

  // Close popover on outside click or Escape key
  useEffect(() => {
    if (!popoverOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        closePopover()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopover()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [popoverOpen])

  const filtered = search.trim()
    ? teamMembers.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : teamMembers

  const handleSelectMember = (member: InternalTeamMember) => {
    setSelectedMember(member)
    setSearch('')
    setComment('')
  }

  const handleConfirmAssign = async () => {
    if (!onAssign || !selectedMember) return
    setAssigning(true)
    try {
      await onAssign(stage.key, selectedMember.id, comment.trim() || undefined)
    } finally {
      setAssigning(false)
      closePopover()
    }
  }

  const taskStatus = stage.task_status
  const assigneeName = stage.assigned_to_name

  return (
    <div
      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        stage.is_complete
          ? 'bg-green-50 dark:bg-green-900/10'
          : stage.is_locked
          ? 'opacity-50'
          : 'hover:bg-black/3 dark:hover:bg-white/3'
      }`}
    >
      <input
        id={`stage-${stage.key}`}
        type="checkbox"
        checked={stage.is_complete}
        disabled={isDisabled}
        onChange={(e) => onToggle(stage.key, e.target.checked)}
        aria-label={stage.display}
        aria-disabled={isDisabled}
        className="mt-0.5 w-4 h-4 accent-mustard cursor-pointer disabled:cursor-not-allowed shrink-0"
      />
      <div className="flex-1 min-w-0">
        <label
          htmlFor={`stage-${stage.key}`}
          className={`text-sm cursor-pointer select-none ${
            stage.is_complete
              ? 'line-through text-black/40 dark:text-slate-500'
              : stage.is_locked
              ? 'text-black/40 dark:text-slate-500 cursor-not-allowed'
              : 'text-black dark:text-white'
          }`}
        >
          {stage.display}
        </label>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {stage.is_complete && stage.completed_by_name && (
            <p className="text-xs text-black/40 dark:text-slate-500">
              <span aria-hidden="true">✓ </span>{stage.completed_by_name}
              {stage.completed_at && (
                <> · {new Date(stage.completed_at).toLocaleDateString('en-IN')}</>
              )}
            </p>
          )}
          {assigneeName && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              <span aria-hidden="true">👤 </span>{assigneeName}
              {taskStatus && taskStatus !== 'not_started' && (
                <span className="ml-1 text-black/40 dark:text-slate-500">· {STATUS_LABELS[taskStatus]}</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Assign button — only shown when not locked and onAssign is provided */}
      {onAssign && !stage.is_locked && (
        <div className="relative shrink-0">
          <button
            ref={triggerRef}
            type="button"
            onClick={openPopover}
            disabled={assigning}
            className="text-xs px-2 py-0.5 rounded border border-black/15 dark:border-white/15 text-black/50 dark:text-slate-400 hover:border-mustard hover:text-mustard transition-colors focus-visible:ring-2 focus-visible:ring-mustard disabled:opacity-50"
            aria-label={`Assign ${stage.display} to a team member`}
            aria-expanded={popoverOpen}
            aria-haspopup="listbox"
          >
            {assigning ? '…' : assigneeName ? 'Reassign' : 'Assign'}
          </button>

          {popoverOpen && (
            <div
              ref={popoverRef}
              style={popoverStyle}
              className="bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg shadow-lg"
              role="dialog"
              aria-label={selectedMember ? 'Confirm assignment' : 'Select team member to assign'}
            >
              {!selectedMember ? (
                // Step 1: pick a member
                <>
                  <div className="p-2 border-b border-black/5 dark:border-white/5">
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search team member…"
                      autoFocus
                      className="w-full text-xs px-2 py-1 border border-black/15 dark:border-white/15 rounded bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-mustard"
                      aria-label="Search team members"
                    />
                  </div>
                  <ul className="max-h-40 overflow-y-auto py-1" role="listbox" aria-label="Team members">
                    {filtered.length === 0 ? (
                      <li className="px-3 py-2 text-xs text-black/40 dark:text-slate-500">No members found</li>
                    ) : (
                      filtered.map((m) => (
                        <li key={m.id} role="option" aria-selected={stage.assigned_to_id === m.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectMember(m)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-mustard/10 focus:bg-mustard/10 focus:outline-none"
                          >
                            <span className="font-medium text-black dark:text-white">{m.name}</span>
                            <span className="ml-1 text-black/40 dark:text-slate-500 capitalize">({m.team})</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              ) : (
                // Step 2: confirm + optional comment
                <div className="p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-black dark:text-white">{selectedMember.name}</p>
                      <p className="text-xs text-black/40 dark:text-slate-500 capitalize">{selectedMember.team}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMember(null)}
                      aria-label="Change selected team member"
                      className="text-xs text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                    >
                      Change
                    </button>
                  </div>
                  <div>
                    <label htmlFor="assign-comment" className="block text-xs text-black/50 dark:text-slate-400 mb-1">
                      Comment <span className="text-black/30 dark:text-slate-600">(optional)</span>
                    </label>
                    <textarea
                      id="assign-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      autoFocus
                      rows={3}
                      placeholder="Add task details, instructions…"
                      className="w-full text-xs border border-black/15 dark:border-white/15 rounded px-2 py-1.5 bg-white dark:bg-slate-700 text-black dark:text-white placeholder-black/30 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-mustard resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={closePopover}
                      className="flex-1 py-1.5 text-xs border border-black/15 dark:border-white/15 rounded text-black/60 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAssign}
                      disabled={assigning}
                      className="flex-1 py-1.5 text-xs bg-mustard text-white font-medium rounded hover:bg-mustard/90 disabled:opacity-50"
                    >
                      {assigning ? '…' : assigneeName ? 'Reassign' : 'Assign'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
