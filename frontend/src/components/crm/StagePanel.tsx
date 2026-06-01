import { useState, useId } from 'react'
import { crmApi } from '@/services/crm'
import type { StageDef, SubStageCompletion, ProjectNote, ProjectFile } from '@/types/crm'
import { useAuthStore } from '@/store/authStore'

interface StagePanelProps {
  projectId: string
  stageDef: StageDef
  subStageCompletions: SubStageCompletion[]
  stageComplete: boolean
  /** When true, the previous stage is incomplete — all interactions are disabled */
  isLocked: boolean
  files: ProjectFile[]
  notes: ProjectNote[]
  onToggleSubStage: (stageKey: string, subKey: string, completed: boolean) => void
  onCompleteStage: (stageKey: string, isComplete: boolean) => void
  onRefresh: () => void
}

export function StagePanel({
  projectId, stageDef, subStageCompletions, stageComplete, isLocked,
  files, notes, onToggleSubStage, onCompleteStage, onRefresh,
}: StagePanelProps) {
  const noteInputId = useId()
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [noteError, setNoteError] = useState('')

  const isSubChecked = (subKey: string) =>
    subStageCompletions.find((s) => s.sub_stage_key === subKey)?.completed ?? false

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newNote.trim()
    if (!text) return
    setNoteError('')
    setAddingNote(true)
    try {
      await crmApi.addNote({ project: projectId, stage_key: stageDef.key, text })
      setNewNote('')
      onRefresh()
    } catch {
      setNoteError('Failed to add note. Please try again.')
    } finally {
      setAddingNote(false)
    }
  }

  const hasSubStages = stageDef.sub_stages.length > 0
  const completedCount = stageDef.sub_stages.filter((s) => isSubChecked(s.key)).length
  const mandatoryCount = stageDef.sub_stages.filter((s) => s.mandatory).length
  const completedMandatory = stageDef.sub_stages.filter((s) => s.mandatory && isSubChecked(s.key)).length

  return (
    <section
      aria-labelledby={`stage-panel-${stageDef.key}`}
      className={`bg-white dark:bg-slate-800 border rounded-lg p-5 space-y-5 ${
        isLocked
          ? 'border-black/5 dark:border-white/5 opacity-70'
          : 'border-black/10 dark:border-white/10'
      }`}
      aria-disabled={isLocked}
    >
      {/* Locked banner */}
      {isLocked && (
        <div
          role="status"
          className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded px-3 py-2"
        >
          <span aria-hidden="true">🔒</span>
          <span>Complete the previous stage first to unlock this stage.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h3 id={`stage-panel-${stageDef.key}`} className="text-lg font-semibold text-black dark:text-white">
          {stageDef.display}
        </h3>
        <div className="flex items-center gap-3">
          {hasSubStages && (
            <span className="text-xs text-black/50 dark:text-slate-500" aria-live="polite">
              {completedCount}/{stageDef.sub_stages.length} steps
              {mandatoryCount > 0 && ` · ${completedMandatory}/${mandatoryCount} required`}
            </span>
          )}
          {stageComplete ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
              <span aria-hidden="true">✓</span> Complete
            </span>
          ) : !hasSubStages && !isLocked ? (
            <button
              onClick={() => onCompleteStage(stageDef.key, true)}
              className="btn-primary text-xs py-1 px-3"
              aria-label={`Mark ${stageDef.display} stage as complete`}
            >
              Mark Complete
            </button>
          ) : null}
          {stageComplete && !hasSubStages && !isLocked && (
            <button
              onClick={() => onCompleteStage(stageDef.key, false)}
              className="btn-secondary text-xs py-1 px-3"
              aria-label={`Mark ${stageDef.display} stage as incomplete`}
            >
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Sub-stages checklist */}
      {hasSubStages && (
        <fieldset>
          <legend className="text-sm font-medium text-black/70 dark:text-slate-300 mb-3">
            Steps
            <span className="ml-2 text-xs font-normal text-black/40 dark:text-slate-500">
              (items marked * are required)
            </span>
          </legend>
          <div className="space-y-2" role="list">
            {stageDef.sub_stages.map((ss) => {
              const checked = isSubChecked(ss.key)
              const checkId = `${stageDef.key}-${ss.key}`
              const completion = subStageCompletions.find((c) => c.sub_stage_key === ss.key)
              return (
                <div
                  key={ss.key}
                  role="listitem"
                  className={`flex items-start gap-3 p-2 rounded transition-colors ${checked ? 'bg-green-50 dark:bg-green-900/10' : 'hover:bg-black/2 dark:hover:bg-white/2'}`}
                >
                  <input
                    id={checkId}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => !isLocked && onToggleSubStage(stageDef.key, ss.key, e.target.checked)}
                    disabled={isLocked}
                    className={`mt-0.5 accent-mustard w-4 h-4 ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    aria-label={`${ss.display}${ss.mandatory ? ' (required)' : ''}${isLocked ? ' — locked' : ''}`}
                  />
                  <div className="flex-1 min-w-0">
                    <label htmlFor={checkId} className={`text-sm cursor-pointer ${checked ? 'line-through text-black/40 dark:text-slate-500' : 'text-black dark:text-white'}`}>
                      {ss.display}
                      {ss.mandatory && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
                    </label>
                    {completion?.completed_by_name && checked && (
                      <p className="text-xs text-black/40 dark:text-slate-500 mt-0.5">
                        by {completion.completed_by_name}
                        {completion.completed_at && ` · ${new Date(completion.completed_at).toLocaleDateString('en-IN')}`}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </fieldset>
      )}

      {/* Files for this stage */}
      {files.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-black/70 dark:text-slate-300 mb-2">
            Attachments ({files.length})
          </h4>
          <ul className="space-y-1">
            {files.map((f) => (
              <li key={f.id}>
                <a
                  href={f.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                  aria-label={`Open file: ${f.filename}`}
                >
                  {f.filename}
                </a>
                <span className="text-xs text-black/40 dark:text-slate-500 ml-2">{f.file_type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes for this stage */}
      <div>
        <h4 className="text-sm font-medium text-black/70 dark:text-slate-300 mb-2" id={`notes-label-${stageDef.key}`}>
          Notes ({notes.length})
        </h4>
        {notes.length > 0 && (
          <ul className="space-y-2 mb-3" aria-labelledby={`notes-label-${stageDef.key}`}>
            {notes.map((note) => (
              <li
                key={note.id}
                className="bg-black/3 dark:bg-white/3 rounded p-3 text-sm"
              >
                <p className="text-black dark:text-white">{note.text}</p>
                <footer className="text-xs text-black/50 dark:text-slate-500 mt-1.5">
                  <span>{note.added_by_name || note.added_by_email || 'Unknown'}</span>
                  <span className="mx-1">·</span>
                  <time dateTime={note.created_at}>
                    {new Date(note.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </time>
                </footer>
              </li>
            ))}
          </ul>
        )}

        {/* Add note form — hidden when stage is locked */}
        {!isLocked && (
          <form onSubmit={handleAddNote} aria-label={`Add note to ${stageDef.display} stage`}>
            <label htmlFor={noteInputId} className="sr-only">
              Add note to {stageDef.display} stage
            </label>
            <textarea
              id={noteInputId}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={`Add note to ${stageDef.display}…`}
              rows={2}
              className="w-full border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard resize-none"
              disabled={addingNote}
              aria-invalid={!!noteError}
              aria-describedby={noteError ? `note-error-${stageDef.key}` : undefined}
            />
            {noteError && (
              <p id={`note-error-${stageDef.key}`} role="alert" className="text-red-600 dark:text-red-400 text-xs mt-1">
                {noteError}
              </p>
            )}
            <button
              type="submit"
              className="mt-2 btn-secondary text-xs"
              disabled={addingNote || !newNote.trim()}
              aria-label={`Save note to ${stageDef.display} stage`}
            >
              {addingNote ? 'Saving…' : 'Add Note'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
