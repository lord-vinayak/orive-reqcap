import { useState } from 'react'
import type { SectionStatus, StageStatusResponse, InternalTeamMember } from '@/types/crm'
import { StageCheckbox } from './StageCheckbox'

interface Props {
  stageStatus: StageStatusResponse
  activeStageKey: string | null
  setActiveStageKey: (key: string) => void
  onCompleteStage: (key: string, complete: boolean) => Promise<void>
  onCompleteSection: (sectionKey: string) => Promise<void>
  onResetBatch: () => Promise<void>
  saving: boolean
  savingStageKeys?: Set<string>
  teamMembers?: InternalTeamMember[]
  onAssign?: (key: string, memberId: string) => Promise<void>
  onUpload?: (stageKey: string, file: File) => Promise<void>
}

export function OrderPhaseView({
  stageStatus, activeStageKey, setActiveStageKey, onCompleteStage, onCompleteSection,
  onResetBatch, saving, savingStageKeys, teamMembers = [], onAssign, onUpload,
}: Props) {
  const { order_phase } = stageStatus
  const [openSectionKey, setOpenSectionKey] = useState<string | null>(null)

  if (order_phase.locked) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center space-y-3"
        role="status"
        aria-live="polite"
      >
        <span className="text-5xl" aria-hidden="true">🔒</span>
        <p className="text-lg font-semibold text-black dark:text-white">Production Phase Locked</p>
        <p className="text-sm text-black/50 dark:text-slate-400 max-w-sm">
          Complete the Sample Phase and book the order to unlock production stages.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4" role="list" aria-label="Production phase sections">
      {order_phase.sections.map((section) => (
        <SectionAccordion
          key={section.key}
          section={section}
          activeKey={activeStageKey}
          setActiveKey={setActiveStageKey}
          open={openSectionKey === section.key}
          setOpen={(v) => setOpenSectionKey(v ? section.key : null)}
          onToggle={onCompleteStage}
          onCompleteSection={onCompleteSection}
          onResetBatch={section.key === 'production' ? onResetBatch : undefined}
          saving={saving}
          savingStageKeys={savingStageKeys}
          teamMembers={teamMembers}
          onAssign={onAssign}
          onUpload={onUpload}
        />
      ))}
    </div>
  )
}

// ── Section accordion ─────────────────────────────────────────────────────────

function SectionAccordion({
  section, activeKey, setActiveKey, open, setOpen, onToggle, onCompleteSection, onResetBatch, saving, savingStageKeys, teamMembers, onAssign, onUpload,
}: {
  section: SectionStatus
  activeKey: string | null
  setActiveKey: (k: string) => void
  open: boolean
  setOpen: (v: boolean) => void
  onToggle: (k: string, v: boolean) => Promise<void>
  onCompleteSection: (sectionKey: string) => Promise<void>
  onResetBatch?: () => Promise<void>
  saving: boolean
  savingStageKeys?: Set<string>
  teamMembers?: InternalTeamMember[]
  onAssign?: (key: string, memberId: string) => Promise<void>
  onUpload?: (stageKey: string, file: File) => Promise<void>
}) {
  const [resetting, setResetting] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const doneCount = section.stages.filter((s) => s.is_complete).length
  const totalCount = section.stages.length
  const incompleteStages = section.stages.filter((s) => !s.is_complete)

  const handleMarkAllComplete = async () => {
    setMarkingAll(true)
    try {
      await onCompleteSection(section.key)
    } finally {
      setMarkingAll(false)
    }
  }

  const handleResetBatch = async () => {
    if (!onResetBatch) return
    if (!window.confirm('Reset batch testing? This will uncheck "Batch Testing Initiated" and "Batch Testing Passed" so you can redo them.')) return
    setResetting(true)
    try {
      await onResetBatch()
    } finally {
      setResetting(false)
    }
  }

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-opacity ${
        section.is_locked
          ? 'border-black/10 dark:border-white/10 opacity-60'
          : section.is_section_complete
          ? 'border-green-500/30 dark:border-green-500/30'
          : 'border-black/15 dark:border-white/15'
      }`}
      role="listitem"
    >
      {/* Section header */}
      <button
        type="button"
        onClick={() => !section.is_locked && setOpen(!open)}
        disabled={section.is_locked}
        aria-expanded={open}
        aria-controls={`section-${section.key}`}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-mustard ${
          section.is_section_complete
            ? 'bg-green-50 dark:bg-green-900/10'
            : section.is_locked
            ? 'bg-black/3 dark:bg-white/3 cursor-not-allowed'
            : 'bg-black/3 dark:bg-white/3 hover:bg-black/5 dark:hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-3">
          {section.is_locked ? (
            <span className="text-black/30 dark:text-slate-600" aria-hidden="true">🔒</span>
          ) : section.is_section_complete ? (
            <span className="text-green-600 dark:text-green-400 font-bold" aria-hidden="true">✓</span>
          ) : (
            <svg
              className={`w-4 h-4 text-black/50 dark:text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
          <span className={`font-semibold text-sm ${
            section.is_section_complete ? 'text-green-700 dark:text-green-300' : 'text-black dark:text-white'
          }`}>
            {section.display}
          </span>
        </div>
        <span
          className="text-xs text-black/40 dark:text-slate-500 tabular-nums"
          aria-label={`${doneCount} of ${totalCount} steps completed`}
        >
          {doneCount} / {totalCount}
        </span>
      </button>

      {/* Section body */}
      {open && !section.is_locked && (
        <>
          {section.key === 'packaging' && (
            <div
              className="mx-3 mt-2 mb-1 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40 text-xs text-amber-800 dark:text-amber-300"
              role="note"
              aria-label="Packaging recommendations"
            >
              <p className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                <span aria-hidden="true">💡 </span>Packaging tips
              </p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li><span className="font-medium">Serums</span> — prefer amber or black glass bottles</li>
                <li><span className="font-medium">SPF</span> — tube or airless packaging; avoid transparent packaging</li>
              </ul>
            </div>
          )}
          <div id={`section-${section.key}`} role="list">
          {section.stages.map((stage) => (
            <div
              key={stage.key}
              role="listitem"
              tabIndex={stage.is_locked ? -1 : 0}
              aria-current={activeKey === stage.key ? 'true' : undefined}
              onClick={() => !stage.is_locked && setActiveKey(stage.key)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !stage.is_locked) {
                  e.preventDefault()
                  setActiveKey(stage.key)
                }
              }}
              className={`cursor-pointer border-t border-black/5 dark:border-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mustard ${
                activeKey === stage.key ? 'ring-2 ring-inset ring-mustard' : ''
              }`}
            >
              <StageCheckbox
                stage={stage} onToggle={onToggle} saving={saving || !!savingStageKeys?.has(stage.key)}
                teamMembers={teamMembers} onAssign={onAssign} onUpload={onUpload}
              />
            </div>
          ))}

          {/* Mark all complete button */}
          {incompleteStages.length > 0 && (
            <div className="px-3 py-2 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={handleMarkAllComplete}
                disabled={markingAll || saving}
                aria-label={`Mark all steps in ${section.display} as complete`}
                className="text-xs text-mustard hover:underline disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-mustard rounded"
              >
                {markingAll ? 'Marking…' : '✓ Mark all complete'}
              </button>
            </div>
          )}

          {/* Reset batch button — shown in Production section */}
          {onResetBatch && (
            <div className="px-3 py-2 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={handleResetBatch}
                disabled={resetting || saving}
                className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-mustard rounded"
                aria-label="Reset batch testing — uncheck batch initiated and batch passed"
              >
                {resetting ? 'Resetting…' : '↺ Batch Testing Failed — Reset Batch'}
              </button>
            </div>
          )}
          </div>
          </>
      )}
    </div>
  )
}
