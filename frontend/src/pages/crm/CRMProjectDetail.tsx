import { useEffect, useState, useId, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import type { CRMProject, StageDef, ProjectNote, SubStageCompletion } from '@/types/crm'
import { ProgressBar } from '@/components/crm/ProgressBar'
import { StatusBadge } from '@/components/crm/StatusBadge'
import { StagePanel } from '@/components/crm/StagePanel'
import { MilestoneTable } from '@/components/crm/MilestoneTable'
import { VendorSidePanel } from '@/components/crm/VendorSidePanel'

export default function CRMProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<CRMProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeStage, setActiveStage] = useState<string | null>(null)
  const [notesView, setNotesView] = useState<'stage' | 'all'>('stage')
  const [vendorPanelOpen, setVendorPanelOpen] = useState(false)

  const fetchProject = () => {
    if (!id) return
    crmApi.getProject(id)
      .then((r) => {
        setProject(r.data)
        if (!activeStage && r.data.stage_definitions.length > 0) {
          setActiveStage(r.data.project_stage)
        }
      })
      .catch(() => setError('Failed to load project.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProject() }, [id])

  if (loading) {
    return (
      <Layout title="Project">
        <div role="status" aria-live="polite" className="text-black/60 dark:text-slate-400 text-sm">
          Loading project…
        </div>
      </Layout>
    )
  }

  if (error || !project) {
    return (
      <Layout title="Project">
        <div role="alert" className="text-red-600 dark:text-red-400 text-sm">{error || 'Project not found.'}</div>
      </Layout>
    )
  }

  const delayedCount = project.delayed_count
  const atRiskCount = project.at_risk_count
  const activeStageNotes = project.notes.filter((n) => n.stage_key === activeStage)
  const allNotes = [...project.notes].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const getSubStageCompletion = (stageKey: string, subKey: string): SubStageCompletion | undefined =>
    project.sub_stage_completions.find((s) => s.stage_key === stageKey && s.sub_stage_key === subKey)

  const isStageComplete = (stageKey: string): boolean =>
    project.stage_completions.find((s) => s.stage_key === stageKey)?.is_complete ?? false

  /**
   * A stage is locked when the immediately preceding stage is not yet complete.
   * Stage 0 (New Lead) is always unlocked.
   * Stages auto-completed at project creation are always considered unlocked.
   */
  const isStageLocked = (stageKey: string): boolean => {
    const stageDef = project.stage_definitions.find((s) => s.key === stageKey)
    if (!stageDef || stageDef.index === 0) return false
    const prevDef = project.stage_definitions.find((s) => s.index === stageDef.index - 1)
    if (!prevDef) return false
    return !isStageComplete(prevDef.key)
  }

  const handleToggleSubStage = async (stageKey: string, subKey: string, completed: boolean) => {
    if (!id || !project) return
    // Optimistic update — flip the checkbox immediately in local state
    setProject((prev) => {
      if (!prev) return prev
      const exists = prev.sub_stage_completions.find(
        (s) => s.stage_key === stageKey && s.sub_stage_key === subKey
      )
      const updated = exists
        ? prev.sub_stage_completions.map((s) =>
            s.stage_key === stageKey && s.sub_stage_key === subKey
              ? { ...s, completed }
              : s
          )
        : [
            ...prev.sub_stage_completions,
            {
              id: `optimistic-${stageKey}-${subKey}`,
              stage_key: stageKey,
              sub_stage_key: subKey,
              completed,
              completed_at: completed ? new Date().toISOString() : null,
              completed_by: null,
              completed_by_name: null,
            },
          ]
      return { ...prev, sub_stage_completions: updated }
    })
    // Sync with server and refresh progress
    try {
      await crmApi.toggleSubStage(id, stageKey, subKey, completed)
    } catch {
      // Revert on failure by re-fetching ground truth
    }
    fetchProject()
  }

  const handleCompleteStage = async (stageKey: string, isComplete: boolean) => {
    if (!id) return
    await crmApi.completeStage(id, stageKey, isComplete)
    fetchProject()
  }

  return (
    <Layout title={project.project_no}>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">{project.project_no}</h1>
            <p className="text-sm text-black/60 dark:text-slate-400 mt-0.5">
              <Link to={`/crm/clients/${project.client}`} className="hover:underline text-mustard">
                {project.client_name}
              </Link>
              {project.client_company && ` · ${project.client_company}`}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setVendorPanelOpen(true)}
              className="btn-secondary text-sm flex items-center gap-1.5"
              aria-haspopup="dialog"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              Vendors
            </button>
            <div className="text-sm text-black/60 dark:text-slate-400 text-right">
              <div>Stage: <span className="font-medium capitalize text-black dark:text-white">{project.project_stage.replace(/_/g, ' ')}</span></div>
              <div className="mt-0.5">Started: {new Date(project.start_date).toLocaleDateString('en-IN')}</div>
            </div>
          </div>
        </div>

        {/* ── Red flag section ── */}
        {(delayedCount > 0 || atRiskCount > 0) && (
          <section
            aria-labelledby="flags-heading"
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <h2 id="flags-heading" className="font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
              <span aria-hidden="true">🚩</span> Flags
            </h2>
            <ul className="space-y-1 text-sm">
              {delayedCount > 0 && (
                <li className="text-red-700 dark:text-red-300">
                  {delayedCount} milestone{delayedCount > 1 ? 's' : ''} delayed
                </li>
              )}
              {atRiskCount > 0 && (
                <li className="text-amber-700 dark:text-amber-300">
                  {atRiskCount} milestone{atRiskCount > 1 ? 's' : ''} at risk (within 2 days)
                </li>
              )}
            </ul>
          </section>
        )}

        {/* ── Overall progress ── */}
        <section aria-labelledby="progress-heading">
          <h2 id="progress-heading" className="sr-only">Overall project progress</h2>
          <ProgressBar value={project.progress_percentage} label="Overall Progress" />
        </section>

        {/* ── Per-stage progress micro-bars ── */}
        <section aria-labelledby="stage-progress-heading">
          <h2 id="stage-progress-heading" className="text-sm font-semibold text-black/60 dark:text-slate-400 uppercase tracking-wide mb-3">
            Stage Progress
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {project.stage_definitions.map((s) => {
              const complete = isStageComplete(s.key)
              const locked = isStageLocked(s.key)
              const isActive = s.key === activeStage

              // Compute partial fill for stages that have sub-stages
              const totalSubs = s.sub_stages?.length ?? 0
              const checkedSubs = totalSubs > 0
                ? project.sub_stage_completions.filter(
                    (sc) => sc.stage_key === s.key && sc.completed
                  ).length
                : 0
              // fillPct: 100 if fully complete, partial if sub-stages in progress, 0 otherwise
              const fillPct = complete
                ? 100
                : totalSubs > 0
                ? Math.round((checkedSubs / totalSubs) * 100)
                : 0

              return (
                <button
                  key={s.key}
                  onClick={() => setActiveStage(s.key)}
                  className={`text-left p-2 rounded border text-xs transition-colors focus-visible:ring-2 focus-visible:ring-mustard ${
                    isActive
                      ? 'border-mustard bg-mustard/10'
                      : locked
                      ? 'border-black/5 dark:border-white/5 opacity-50 cursor-default'
                      : 'border-black/10 dark:border-white/10 hover:border-mustard/50'
                  }`}
                  aria-pressed={isActive}
                  aria-label={`${s.display} stage, ${complete ? 'complete' : locked ? 'locked — complete previous stage first' : `${fillPct}% done`}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-black dark:text-white truncate">{s.display}</span>
                    {complete
                      ? <span aria-hidden="true" className="text-green-500 ml-1">✓</span>
                      : locked
                      ? <span aria-hidden="true" className="text-black/30 dark:text-white/30 ml-1">🔒</span>
                      : totalSubs > 0 && checkedSubs > 0
                      ? <span className="text-black/40 dark:text-slate-500 tabular-nums ml-1">{checkedSubs}/{totalSubs}</span>
                      : null}
                  </div>
                  {/* Track (grey) with filled portion on top */}
                  <div className="h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${complete ? 'bg-green-500' : 'bg-mustard'}`}
                      style={{ width: `${fillPct}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Stage panel ── */}
          <div className="lg:col-span-2 space-y-4">
            {activeStage && (
              <StagePanel
                projectId={project.id}
                stageDef={project.stage_definitions.find((s) => s.key === activeStage)!}
                subStageCompletions={project.sub_stage_completions.filter((s) => s.stage_key === activeStage)}
                stageComplete={isStageComplete(activeStage)}
                isLocked={isStageLocked(activeStage)}
                files={project.files.filter((f) => f.stage_key === activeStage)}
                notes={activeStageNotes}
                onToggleSubStage={handleToggleSubStage}
                onCompleteStage={handleCompleteStage}
                onRefresh={fetchProject}
              />
            )}
          </div>

          {/* ── Right: Project meta + notes ── */}
          <div className="space-y-4">
            {/* Project meta */}
            <ProjectInfoPanel project={project} onRefresh={fetchProject} />

            {/* Timeline milestones */}
            {project.milestones.length > 0 && (
              <MilestoneTable milestones={project.milestones} projectId={project.id} onRefresh={fetchProject} />
            )}
          </div>
        </div>

        {/* ── Consolidated Notes ── */}
        <section aria-labelledby="notes-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="notes-heading" className="text-lg font-semibold text-black dark:text-white">Notes</h2>
            <div role="group" aria-label="Notes view toggle" className="flex border border-black/10 dark:border-white/10 rounded overflow-hidden">
              <button
                onClick={() => setNotesView('stage')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-mustard ${notesView === 'stage' ? 'bg-mustard text-black' : 'text-black/60 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                aria-pressed={notesView === 'stage'}
              >
                By Stage
              </button>
              <button
                onClick={() => setNotesView('all')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-mustard ${notesView === 'all' ? 'bg-mustard text-black' : 'text-black/60 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                aria-pressed={notesView === 'all'}
              >
                Timeline
              </button>
            </div>
          </div>

          {notesView === 'stage' ? (
            <div className="space-y-4">
              {project.stage_definitions.map((s) => {
                const stageNotes = project.notes.filter((n) => n.stage_key === s.key)
                if (stageNotes.length === 0) return null
                return (
                  <details key={s.key} className="border border-black/10 dark:border-white/10 rounded-lg">
                    <summary className="px-4 py-3 cursor-pointer font-medium text-black dark:text-white text-sm select-none hover:bg-black/2 dark:hover:bg-white/2">
                      {s.display} ({stageNotes.length})
                    </summary>
                    <div className="px-4 pb-4 space-y-2">
                      {stageNotes.map((note) => <NoteItem key={note.id} note={note} />)}
                    </div>
                  </details>
                )
              })}
              {project.notes.filter((n) => !n.stage_key).length > 0 && (
                <details className="border border-black/10 dark:border-white/10 rounded-lg">
                  <summary className="px-4 py-3 cursor-pointer font-medium text-black dark:text-white text-sm select-none hover:bg-black/2 dark:hover:bg-white/2">
                    Project-level notes ({project.notes.filter((n) => !n.stage_key).length})
                  </summary>
                  <div className="px-4 pb-4 space-y-2">
                    {project.notes.filter((n) => !n.stage_key).map((note) => <NoteItem key={note.id} note={note} />)}
                  </div>
                </details>
              )}
              {project.notes.length === 0 && (
                <p className="text-black/60 dark:text-slate-400 text-sm">No notes yet.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {allNotes.length === 0 && (
                <p className="text-black/60 dark:text-slate-400 text-sm">No notes yet.</p>
              )}
              {allNotes.map((note) => (
                <div key={note.id} className="flex gap-3">
                  <div className="text-xs text-mustard font-medium w-28 shrink-0 pt-1">
                    {note.stage_key ? note.stage_key.replace(/_/g, ' ') : 'Project'}
                  </div>
                  <NoteItem note={note} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Key Learnings ── */}
        <KeyLearningsSection projectId={project.id} />
      </div>

      {vendorPanelOpen && (
        <VendorSidePanel
          project={project}
          onClose={() => setVendorPanelOpen(false)}
          onSaved={(updated) => {
            setProject((prev) => prev ? { ...prev, ...updated } : prev)
            setVendorPanelOpen(false)
          }}
        />
      )}
    </Layout>
  )
}

// ── Project Info panel with inline Sample Booked Date edit ─────────────────────

function ProjectInfoPanel({ project, onRefresh }: { project: CRMProject; onRefresh: () => void }) {
  const dateInputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [dateValue, setDateValue] = useState(project.sample_booked_date ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const startEdit = () => {
    setDateValue(project.sample_booked_date ?? '')
    setSaveError('')
    setEditing(true)
    // Focus the input on next tick after it mounts
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await crmApi.updateProject(project.id, { sample_booked_date: dateValue || null })
      setEditing(false)
      onRefresh()
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setSaveError('')
  }

  return (
    <section
      aria-labelledby="project-meta-heading"
      className="bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg p-4 space-y-3"
    >
      <h2 id="project-meta-heading" className="font-semibold text-black dark:text-white">Project Info</h2>
      <dl className="space-y-2 text-sm">
        <MetaField label="Products" value={project.no_of_products?.toString() ?? '—'} />
        <MetaField label="MOQ" value={project.moq?.toString() ?? '—'} />
        <MetaField label="Manufacturer" value={project.manufacturer_name ?? '—'} />
        <MetaField label="Designer" value={project.designer_name ?? '—'} />
        <MetaField label="Packaging Vendor" value={project.packaging_vendor_name ?? '—'} />
        <MetaField label="Printer" value={project.printer_name ?? '—'} />
        <MetaField label="Batch Testing" value={project.batch_testing_vendor_name ?? '—'} />
        <MetaField label="Derma Testing" value={project.derma_testing_vendor_name ?? '—'} />
        <MetaField label="Sales POC" value={project.sales_poc_name ?? '—'} />
        <MetaField label="Formulation POC" value={project.formulation_poc_name ?? '—'} />

        {/* Sample Booked Date — inline editable */}
        <div>
          <div className="flex justify-between items-center gap-2">
            <dt className="text-black/50 dark:text-slate-500 shrink-0">Sample Booked</dt>
            {!editing && (
              <dd className="flex items-center gap-2">
                <span className="font-medium text-black dark:text-white text-right">
                  {project.sample_booked_date ?? <span className="text-black/30 dark:text-slate-600 font-normal">Not set</span>}
                </span>
                <button
                  onClick={startEdit}
                  className="text-xs text-mustard hover:underline focus-visible:ring-1 focus-visible:ring-mustard rounded"
                  aria-label={project.sample_booked_date ? 'Edit sample booked date' : 'Set sample booked date'}
                >
                  {project.sample_booked_date ? 'Edit' : 'Set date'}
                </button>
              </dd>
            )}
          </div>

          {editing && (
            <div className="mt-2 space-y-1">
              <label htmlFor={dateInputId} className="sr-only">Sample booked date</label>
              <div className="flex items-center gap-2">
                <input
                  id={dateInputId}
                  ref={inputRef}
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="flex-1 border border-mustard rounded px-2 py-1 text-xs bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
                  disabled={saving}
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary text-xs py-1 px-2"
                  aria-label="Save sample booked date"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="btn-secondary text-xs py-1 px-2"
                  aria-label="Cancel editing"
                >
                  Cancel
                </button>
              </div>
              {saveError && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
              )}
            </div>
          )}
        </div>
      </dl>
    </section>
  )
}

function NoteItem({ note }: { note: ProjectNote }) {
  return (
    <article
      className="bg-black/3 dark:bg-white/3 rounded p-3 text-sm"
      aria-label={`Note by ${note.added_by_name || 'Unknown'}`}
    >
      <p className="text-black dark:text-white">{note.text}</p>
      <footer className="text-xs text-black/50 dark:text-slate-500 mt-1.5">
        <span>{note.added_by_name || note.added_by_email || 'Unknown'}</span>
        <span className="mx-1">·</span>
        <time dateTime={note.created_at}>
          {new Date(note.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </time>
      </footer>
    </article>
  )
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-black/50 dark:text-slate-500">{label}</dt>
      <dd className="font-medium text-black dark:text-white text-right">{value}</dd>
    </div>
  )
}

function KeyLearningsSection({ projectId }: { projectId: string }) {
  const inputId = useId()
  const [learnings, setLearnings] = useState<import('@/types/crm').KeyLearning[]>([])
  const [newText, setNewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [similarLearnings, setSimilarLearnings] = useState<import('@/types/crm').KeyLearning[]>([])
  const [showSimilar, setShowSimilar] = useState(false)

  const fetchLearnings = () =>
    crmApi.listKeyLearnings(projectId).then((r) => setLearnings(r.data.results))

  useEffect(() => { fetchLearnings() }, [projectId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim()) return
    setSubmitting(true)
    await crmApi.addKeyLearning({ project: projectId, text: newText.trim() })
    setNewText('')
    await fetchLearnings()
    setSubmitting(false)
  }

  const handleShowSimilar = async () => {
    if (!showSimilar) {
      const res = await crmApi.getSimilarLearnings(projectId)
      setSimilarLearnings(res.data)
    }
    setShowSimilar((v) => !v)
  }

  return (
    <section aria-labelledby="learnings-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="learnings-heading" className="text-lg font-semibold text-black dark:text-white">Key Learnings</h2>
        <button
          onClick={handleShowSimilar}
          className="btn-secondary text-xs"
          aria-expanded={showSimilar}
          aria-controls="similar-learnings"
        >
          {showSimilar ? 'Hide' : 'View'} Similar Learnings
        </button>
      </div>

      {showSimilar && (
        <div id="similar-learnings" className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
            Learnings from similar projects (same client / manufacturer)
          </h3>
          {similarLearnings.length === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">No similar learnings found.</p>
          ) : (
            <ul className="space-y-2">
              {similarLearnings.map((l) => (
                <li key={l.id} className="text-sm text-amber-900 dark:text-amber-200 border-l-2 border-amber-400 pl-3">
                  {l.text}
                  <div className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                    {l.created_by_name} · {new Date(l.created_at).toLocaleDateString('en-IN')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Existing learnings */}
      {learnings.length > 0 && (
        <ul className="space-y-2 mb-4">
          {learnings.map((l) => (
            <li key={l.id} className="text-sm border-l-2 border-mustard pl-3 py-1 text-black dark:text-white">
              {l.text}
              <div className="text-xs text-black/50 dark:text-slate-500 mt-0.5">
                {l.created_by_name} · {new Date(l.created_at).toLocaleDateString('en-IN')}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add new learning */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">Add a key learning</label>
        <input
          id={inputId}
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a key learning…"
          className="flex-1 border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          disabled={submitting}
        />
        <button
          type="submit"
          className="btn-primary text-sm"
          disabled={submitting || !newText.trim()}
          aria-label="Add key learning"
        >
          Add
        </button>
      </form>
    </section>
  )
}
