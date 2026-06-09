import { useEffect, useId, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import type { CRMProject, ProjectNote, StageStatusResponse, StageStatusItem, ProjectPayment, InternalTeamMember, TaskItem } from '@/types/crm'
import { ProgressBar } from '@/components/crm/ProgressBar'
import { MilestoneTable } from '@/components/crm/MilestoneTable'
import { VendorSidePanel } from '@/components/crm/VendorSidePanel'
import { PaymentSidePanel } from '@/components/crm/PaymentSidePanel'
import { SamplePhaseView } from '@/components/crm/SamplePhaseView'
import { OrderPhaseView } from '@/components/crm/OrderPhaseView'
import { useTaskSocket } from '@/hooks/useTaskSocket'
import { LeadStatusBadge } from '@/components/LeadStatusBadge'
import type { LeadStatus } from '@/constants/clientStatus'

// Flip is_complete for the target stage then re-walk the list recomputing
// is_locked = !previous.is_complete — mirrors the backend _stage_info chain.
function recomputeLocks(stages: StageStatusItem[], key: string, complete: boolean, firstUnlocked: boolean): StageStatusItem[] {
  let prev = firstUnlocked
  return stages.map((s) => {
    const isComplete = s.key === key ? complete : s.is_complete
    const updated = { ...s, is_complete: isComplete, is_locked: !prev }
    prev = isComplete
    return updated
  })
}

function patchStage(status: StageStatusResponse, key: string, complete: boolean): StageStatusResponse {
  const sp = status.sample_phase
  const preLoop = recomputeLocks(sp.pre_loop, key, complete, true)
  const preLoopComplete = preLoop.every((s) => s.is_complete)

  const loopCycles = sp.loop_cycles.map((lc) => {
    const stages = recomputeLocks(lc.stages, key, complete, preLoopComplete)
    return { ...lc, stages }
  })

  // post_approval unlocks only after sample is approved (last stage of active cycle)
  const activeCycle = loopCycles.find((lc) => lc.is_active)
  const approvalComplete = activeCycle
    ? (activeCycle.stages.find((s) => s.key.startsWith('sample_approved'))?.is_complete ?? false)
    : false
  const postApproval = recomputeLocks(sp.post_approval, key, complete, approvalComplete)

  const orderLocked = !status.order_booked
  const sections = status.order_phase.sections.map((sec) => {
    const stages = recomputeLocks(sec.stages, key, complete, !orderLocked)
    const is_section_complete = stages.every((s) => s.is_complete)
    return { ...sec, stages, is_section_complete }
  })

  return {
    ...status,
    sample_phase: { ...sp, pre_loop: preLoop, loop_cycles: loopCycles, post_approval: postApproval },
    order_phase: { ...status.order_phase, sections },
  }
}

export default function CRMProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<CRMProject | null>(null)
  const [stageStatus, setStageStatus] = useState<StageStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePhase, setActivePhase] = useState<'sample' | 'order'>('sample')
  const [activeStageKey, setActiveStageKey] = useState<string | null>(null)
  const [notesView, setNotesView] = useState<'stage' | 'all'>('stage')
  const [vendorPanelOpen, setVendorPanelOpen] = useState(false)
  const [paymentPanelOpen, setPaymentPanelOpen] = useState(false)
  const [payments, setPayments] = useState<ProjectPayment[]>([])
  const [actionSaving, setActionSaving] = useState(false)
  const [teamMembers, setTeamMembers] = useState<InternalTeamMember[]>([])

  const fetchProject = () => {
    if (!id) return
    return crmApi.getProject(id)
      .then((r) => setProject(r.data))
      .catch(() => setError('Failed to load project.'))
  }

  const fetchStageStatus = () => {
    if (!id) return
    return crmApi.getStageStatus(id)
      .then((r) => {
        setStageStatus(r.data)
        setActivePhase(r.data.phase)
      })
  }

  const fetchPayments = () => {
    if (!id) return
    crmApi.listProjectPayments(id).then((r) => {
      const data = Array.isArray(r.data) ? r.data : (r.data as any).results ?? []
      setPayments(data)
    })
  }

  useEffect(() => {
    if (!id) return
    Promise.all([fetchProject(), fetchStageStatus(), fetchPayments()])
      .finally(() => setLoading(false))
    crmApi.allTeamMembers().then((r) => {
      const arr = Array.isArray(r.data) ? r.data : (r.data as any).results ?? []
      setTeamMembers(arr)
    })
  }, [id])

  // WS: when a task is assigned/updated by anyone, refresh stage status
  useTaskSocket((_task: TaskItem) => {
    fetchStageStatus()
  })

  const refresh = async () => {
    await Promise.all([fetchProject(), fetchStageStatus()])
  }

  // ── Stage action handlers ──────────────────────────────────────────────────

  const handleCompleteStage = async (key: string, complete: boolean) => {
    if (!id || !stageStatus) return
    const previous = stageStatus
    setStageStatus(patchStage(previous, key, complete))
    try {
      const res = await crmApi.completeStage(id, key, complete)
      setStageStatus(res.data)
    } catch {
      setStageStatus(previous)
    }
  }

  const handleCompleteSection = async (sectionKey: string) => {
    if (!id) return
    setActionSaving(true)
    try {
      const res = await crmApi.completeSectionStages(id, sectionKey)
      setStageStatus(res.data)
    } finally {
      setActionSaving(false)
    }
  }

  const handleApproveSample = async (approved: boolean, reason?: string) => {
    if (!id) return
    setActionSaving(true)
    try {
      const res = await crmApi.approveSample(id, approved, reason)
      setStageStatus(res.data)
      await fetchProject()
    } finally {
      setActionSaving(false)
    }
  }

  const handleSetOrderGate = async (data: { order_advance_received: boolean; order_booked: boolean }) => {
    if (!id) return
    setActionSaving(true)
    try {
      const res = await crmApi.setOrderGate(id, data)
      setStageStatus(res.data)
      if (data.order_booked) setActivePhase('order')
      await fetchProject()
    } finally {
      setActionSaving(false)
    }
  }

  const handleResetBatch = async () => {
    if (!id) return
    setActionSaving(true)
    try {
      const res = await crmApi.resetBatch(id)
      setStageStatus(res.data)
      await fetchProject()
    } finally {
      setActionSaving(false)
    }
  }

  const handleAssignStage = async (stageKey: string, memberId: string, comment?: string) => {
    if (!id) return
    await crmApi.assignStage(id, stageKey, memberId, comment ? { comment } : undefined)
    await fetchStageStatus()
  }

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout title="Project">
        <div role="status" aria-live="polite" className="text-black/60 dark:text-slate-300 text-sm">
          Loading project…
        </div>
      </Layout>
    )
  }

  if (error || !project) {
    return (
      <Layout title="Project">
        <div role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {error || 'Project not found.'}
        </div>
      </Layout>
    )
  }

  const delayedCount = project.delayed_count
  const atRiskCount = project.at_risk_count
  const progress = stageStatus?.progress

  // Notes filtered for the active stage key (shown in the right sidebar area)
  const activeStageNotes = activeStageKey
    ? project.notes.filter((n) => n.stage_key === activeStageKey)
    : []
  const allNotes = [...project.notes].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <Layout title={project.project_no}>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">{project.project_no}</h1>
            <p className="text-sm text-black/60 dark:text-slate-300 mt-0.5">
              <Link to={`/crm/clients/${project.client}`} className="hover:underline text-mustard">
                {project.client_name}
              </Link>
              {project.client_company && ` · ${project.client_company}`}
            </p>
            <div className="mt-1.5">
              <LeadStatusBadge
                client={{ phone_no: project.client_phone, lead_status: project.client_lead_status as LeadStatus, lead_sub_status: project.client_lead_sub_status }}
                onUpdated={(patch) => setProject((prev) => prev ? { ...prev, ...patch } : prev)}
              />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setPaymentPanelOpen(true)}
              className="btn-secondary text-sm flex items-center gap-1.5"
              aria-haspopup="dialog"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              Payments
            </button>
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
            <div className="text-sm text-black/60 dark:text-slate-300 text-right">
              <div>
                Phase:{' '}
                <span className={`font-medium ${project.phase === 'order' ? 'text-green-600 dark:text-green-400' : 'text-mustard'}`}>
                  {project.phase === 'order' ? 'Order/Production' : 'Sample'}
                </span>
              </div>
              <div className="mt-0.5">Started: {new Date(project.start_date).toLocaleDateString('en-IN')}</div>
            </div>
          </div>
        </div>

        {/* ── Red flags ── */}
        {(delayedCount > 0 || atRiskCount > 0) && (
          <section aria-labelledby="flags-heading" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
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

        {/* ── Progress bars ── */}
        {progress && (
          <section aria-labelledby="progress-heading" className="space-y-2">
            <h2 id="progress-heading" className="sr-only">Project progress</h2>
            <ProgressBar
              value={progress.overall_pct}
              label={`Overall Progress — ${progress.overall_pct}%`}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-black/50 dark:text-slate-300 mb-1">
                  Sample Phase ({progress.sample_done}/{progress.sample_total})
                </p>
                <ProgressBar
                  value={Math.round((progress.sample_done / progress.sample_total) * 100)}
                  size="sm"
                />
              </div>
              <div>
                <p className="text-xs text-black/50 dark:text-slate-300 mb-1">
                  {stageStatus?.order_phase.locked ? '🔒 ' : ''}Order Phase ({progress.order_done}/{progress.order_total})
                </p>
                <ProgressBar
                  value={Math.round((progress.order_done / progress.order_total) * 100)}
                  size="sm"
                />
              </div>
            </div>
          </section>
        )}

        {/* ── Phase tabs ── */}
        {stageStatus && (
          <nav aria-label="Project phase" role="tablist" className="flex border-b border-black/10 dark:border-white/10">
            {(['sample', 'order'] as const).map((phase) => {
              const isLocked = phase === 'order' && stageStatus.order_phase.locked
              return (
                <button
                  key={phase}
                  id={`phase-tab-${phase}`}
                  role="tab"
                  aria-selected={activePhase === phase}
                  aria-controls={`phase-panel-${phase}`}
                  onClick={() => !isLocked && setActivePhase(phase)}
                  disabled={isLocked}
                  className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:ring-2 focus-visible:ring-mustard ${
                    activePhase === phase
                      ? 'border-mustard text-mustard'
                      : isLocked
                      ? 'border-transparent text-black/30 dark:text-slate-600 cursor-not-allowed'
                      : 'border-transparent text-black/60 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-black/20'
                  }`}
                >
                  {phase === 'sample' ? 'Sample Phase' : 'Order Phase'}
                  {phase === 'order' && !isLocked && ' ✓'}
                </button>
              )
            })}
          </nav>
        )}

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Phase view */}
          <div
            className="lg:col-span-2"
            role="tabpanel"
            id={`phase-panel-${activePhase}`}
            aria-labelledby={`phase-tab-${activePhase}`}
            tabIndex={0}
          >
            {stageStatus && activePhase === 'sample' && (
              <SamplePhaseView
                stageStatus={stageStatus}
                projectId={project.id}
                activeStageKey={activeStageKey}
                setActiveStageKey={setActiveStageKey}
                onCompleteStage={handleCompleteStage}
                onApproveSample={handleApproveSample}
                onSetOrderGate={handleSetOrderGate}
                saving={actionSaving}
                teamMembers={teamMembers}
                onAssign={handleAssignStage}
              />
            )}
            {stageStatus && activePhase === 'order' && (
              <OrderPhaseView
                stageStatus={stageStatus}
                activeStageKey={activeStageKey}
                setActiveStageKey={setActiveStageKey}
                onCompleteStage={handleCompleteStage}
                onCompleteSection={handleCompleteSection}
                onResetBatch={handleResetBatch}
                saving={actionSaving}
                teamMembers={teamMembers}
                onAssign={handleAssignStage}
              />
            )}
          </div>

          {/* Right: Project info + notes/files for active stage */}
          <div className="space-y-4">
            <ProjectInfoPanel project={project} onRefresh={fetchProject} />

            {project.milestones.length > 0 && (
              <MilestoneTable milestones={project.milestones} projectId={project.id} onRefresh={fetchProject} />
            )}

            {/* Active stage notes + files panel */}
            {activeStageKey && (
              <ActiveStagePanel
                stageKey={activeStageKey}
                projectId={project.id}
                notes={activeStageNotes}
                files={project.files.filter((f) => f.stage_key === activeStageKey)}
                onRefresh={refresh}
              />
            )}
          </div>
        </div>

        {/* ── Consolidated Notes ── */}
        <section aria-labelledby="notes-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="notes-heading" className="text-lg font-semibold text-black dark:text-white">All Notes</h2>
            <div role="group" aria-label="Notes view toggle" className="flex border border-black/10 dark:border-white/10 rounded overflow-hidden">
              {(['stage', 'all'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setNotesView(v)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-mustard ${
                    notesView === v ? 'bg-mustard text-black' : 'text-black/60 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  aria-pressed={notesView === v}
                >
                  {v === 'stage' ? 'By Stage' : 'Timeline'}
                </button>
              ))}
            </div>
          </div>

          {notesView === 'stage' ? (
            <div className="space-y-3">
              {/* Group notes by stage key */}
              {Array.from(new Set(project.notes.map((n) => n.stage_key || ''))).map((stageKey) => {
                const stageNotes = project.notes.filter((n) => (n.stage_key || '') === stageKey)
                const label = stageKey ? stageKey.replace(/_c[23]$/, '').replace(/_/g, ' ') : 'Project level'
                return (
                  <details key={stageKey || '__project__'} className="border border-black/10 dark:border-white/10 rounded-lg">
                    <summary className="px-4 py-3 cursor-pointer font-medium text-black dark:text-white text-sm select-none hover:bg-black/2 dark:hover:bg-white/2 capitalize">
                      {label} ({stageNotes.length})
                    </summary>
                    <div className="px-4 pb-4 space-y-2">
                      {stageNotes.map((note) => <NoteItem key={note.id} note={note} />)}
                    </div>
                  </details>
                )
              })}
              {project.notes.length === 0 && (
                <p className="text-black/60 dark:text-slate-300 text-sm">No notes yet.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {allNotes.length === 0 && (
                <p className="text-black/60 dark:text-slate-300 text-sm">No notes yet.</p>
              )}
              {allNotes.map((note) => (
                <div key={note.id} className="flex gap-3">
                  <div className="text-xs text-mustard font-medium w-32 shrink-0 pt-1 capitalize">
                    {note.stage_key ? note.stage_key.replace(/_c[23]$/, '').replace(/_/g, ' ') : 'Project'}
                  </div>
                  <NoteItem note={note} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── P&L ── */}
        <PLSection payments={payments} />

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

      {paymentPanelOpen && (
        <PaymentSidePanel
          projectId={project.id}
          projectClientName={project.client_name}
          onClose={() => setPaymentPanelOpen(false)}
          onChanged={fetchPayments}
        />
      )}
    </Layout>
  )
}

// ── Active stage notes / files panel ──────────────────────────────────────────

function ActiveStagePanel({
  stageKey, projectId, notes, files, onRefresh,
}: {
  stageKey: string
  projectId: string
  notes: ProjectNote[]
  files: import('@/types/crm').ProjectFile[]
  onRefresh: () => void
}) {
  const textareaId = useId()
  const [noteText, setNoteText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const displayKey = stageKey.replace(/_c[23]$/, '').replace(/_/g, ' ')

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim()) return
    setSubmitting(true)
    try {
      await crmApi.addNote({ project: projectId, stage_key: stageKey, text: noteText.trim() })
      setNoteText('')
      onRefresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="active-stage-heading"
      className="bg-white dark:bg-slate-800 border border-mustard/30 rounded-lg p-4 space-y-3"
    >
      <h3 id="active-stage-heading" className="font-semibold text-sm text-black dark:text-white capitalize">
        {displayKey}
      </h3>

      {files.length > 0 && (
        <div>
          <p className="text-xs font-medium text-black/50 dark:text-slate-300 mb-1.5">Attachments ({files.length})</p>
          <ul className="space-y-1">
            {files.map((f) => (
              <li key={f.id}>
                <a
                  href={f.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-mustard hover:underline flex items-center gap-1"
                >
                  <span aria-hidden="true">📎</span> {f.filename}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-black/50 dark:text-slate-300">Notes ({notes.length})</p>
          {notes.map((note) => <NoteItem key={note.id} note={note} />)}
        </div>
      )}

      <form onSubmit={handleAddNote} className="space-y-1.5">
        <label htmlFor={textareaId} className="sr-only">Add a note for {displayKey}</label>
        <textarea
          id={textareaId}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          disabled={submitting}
          className="w-full border border-black/15 dark:border-white/15 rounded px-2 py-1.5 text-xs bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard resize-none"
        />
        <button
          type="submit"
          disabled={submitting || !noteText.trim()}
          className="btn-primary text-xs py-1 px-3 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Add Note'}
        </button>
      </form>
    </section>
  )
}

// ── Project Info panel ─────────────────────────────────────────────────────────

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
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await crmApi.updateProject(project.id, { sample_booked_date: dateValue || null } as any)
      setEditing(false)
      onRefresh()
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
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
        <MetaField label="Manufacturer" value={project.manufacturers?.length ? project.manufacturers.map((m) => m.company_name).join(', ') : '—'} />
        <MetaField label="Designer" value={project.designers?.length ? project.designers.map((v) => v.company_name).join(', ') : '—'} />
        <MetaField label="Packaging Vendor" value={project.packaging_vendors?.length ? project.packaging_vendors.map((v) => v.company_name).join(', ') : '—'} />
        <MetaField label="Printer" value={project.printers?.length ? project.printers.map((v) => v.company_name).join(', ') : '—'} />
        <MetaField label="Batch Testing" value={project.batch_testing_vendors?.length ? project.batch_testing_vendors.map((v) => v.company_name).join(', ') : '—'} />
        <MetaField label="Derma Testing" value={project.derma_testing_vendors?.length ? project.derma_testing_vendors.map((v) => v.company_name).join(', ') : '—'} />
        <MetaField label="Sales POC" value={project.sales_poc_name ?? '—'} />
        <MetaField label="Formulation POC" value={project.formulation_poc_name ?? '—'} />

        {/* Sample Booked Date */}
        <div>
          <div className="flex justify-between items-center gap-2">
            <dt className="text-black/50 dark:text-slate-300 shrink-0">Sample Booked</dt>
            {!editing && (
              <dd className="flex items-center gap-2">
                <span className="font-medium text-black dark:text-white text-right">
                  {project.sample_booked_date ?? <span className="text-black/50 dark:text-slate-300 font-normal">Not set</span>}
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
                <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1 px-2">
                  {saving ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} disabled={saving} className="btn-secondary text-xs py-1 px-2">
                  Cancel
                </button>
              </div>
              {saveError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}
            </div>
          )}
        </div>
      </dl>
    </section>
  )
}

// ── Shared components ──────────────────────────────────────────────────────────

function NoteItem({ note }: { note: ProjectNote }) {
  return (
    <article
      className="bg-black/3 dark:bg-white/3 rounded p-3 text-sm"
      aria-label={`Note by ${note.added_by_name || 'Unknown'}`}
    >
      <p className="text-black dark:text-white">{note.text}</p>
      <footer className="text-xs text-black/50 dark:text-slate-300 mt-1.5">
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
      <dt className="text-black/50 dark:text-slate-300">{label}</dt>
      <dd className="font-medium text-black dark:text-white text-right">{value}</dd>
    </div>
  )
}

// ── P&L Section ───────────────────────────────────────────────────────────────

function PLSection({ payments }: { payments: import('@/types/crm').ProjectPayment[] }) {
  const [open, setOpen] = useState(false)
  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (payments.length === 0) {
    return (
      <section aria-labelledby="pl-heading">
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white hover:text-mustard transition-colors"
          aria-expanded={open}>
          <svg className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          P&L Summary <span className="text-xs font-normal text-black/40 dark:text-slate-300">(no payments yet)</span>
        </button>
      </section>
    )
  }

  const bySubType: Record<string, { label: string; paid: number; received: number }> = {}
  for (const p of payments) {
    const key = `${p.direction}::${p.sub_type}`
    if (!bySubType[key]) bySubType[key] = { label: p.sub_type_display, paid: 0, received: 0 }
    if (p.direction === 'paid') bySubType[key].paid += Number(p.amount)
    else bySubType[key].received += Number(p.amount)
  }
  const rows = Object.entries(bySubType).map(([key, vals]) => ({
    key, label: vals.label, direction: key.startsWith('paid') ? 'paid' : 'received',
    paid: vals.paid, received: vals.received, net: vals.received - vals.paid,
  }))
  const totalPaid = payments.filter((p) => p.direction === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const totalReceived = payments.filter((p) => p.direction === 'received').reduce((s, p) => s + Number(p.amount), 0)
  const totalNet = totalReceived - totalPaid

  return (
    <section aria-labelledby="pl-heading">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white hover:text-mustard transition-colors mb-3"
        aria-expanded={open} id="pl-heading">
        <svg className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        P&L Summary
        {!open && (
          <span className={`text-sm font-medium ml-1 ${totalNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {totalNet >= 0 ? '+' : ''}₹{fmt(totalNet)}
          </span>
        )}
      </button>
      {open && (
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-left">
                <th className="px-4 py-2 font-semibold text-black/70 dark:text-slate-300">Type</th>
                <th className="px-4 py-2 font-semibold text-black/70 dark:text-slate-300">Sub Type</th>
                <th className="px-4 py-2 font-semibold text-red-600 dark:text-red-400 text-right">Total Paid (₹)</th>
                <th className="px-4 py-2 font-semibold text-green-600 dark:text-green-400 text-right">Total Received (₹)</th>
                <th className="px-4 py-2 font-semibold text-black/70 dark:text-slate-300 text-right">Net (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-black/2 dark:hover:bg-white/2">
                  <td className="px-4 py-2">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${r.direction === 'paid' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                      {r.direction === 'paid' ? 'Paid' : 'Received'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-black dark:text-white">{r.label}</td>
                  <td className="px-4 py-2 text-right text-red-600 dark:text-red-400 tabular-nums">{r.paid > 0 ? fmt(r.paid) : '—'}</td>
                  <td className="px-4 py-2 text-right text-green-600 dark:text-green-400 tabular-nums">{r.received > 0 ? fmt(r.received) : '—'}</td>
                  <td className={`px-4 py-2 text-right tabular-nums font-medium ${r.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {r.net >= 0 ? '+' : ''}{fmt(r.net)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-black/5 dark:bg-white/5 border-t-2 border-black/20 dark:border-white/20 font-semibold">
                <td className="px-4 py-2 text-black dark:text-white" colSpan={2}>Total</td>
                <td className="px-4 py-2 text-right text-red-600 dark:text-red-400 tabular-nums">{fmt(totalPaid)}</td>
                <td className="px-4 py-2 text-right text-green-600 dark:text-green-400 tabular-nums">{fmt(totalReceived)}</td>
                <td className={`px-4 py-2 text-right tabular-nums text-base ${totalNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {totalNet >= 0 ? '+' : ''}₹{fmt(totalNet)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}

// ── Key Learnings Section ──────────────────────────────────────────────────────

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

      {learnings.length > 0 && (
        <ul className="space-y-2 mb-4">
          {learnings.map((l) => (
            <li key={l.id} className="text-sm border-l-2 border-mustard pl-3 py-1 text-black dark:text-white">
              {l.text}
              <div className="text-xs text-black/50 dark:text-slate-300 mt-0.5">
                {l.created_by_name} · {new Date(l.created_at).toLocaleDateString('en-IN')}
              </div>
            </li>
          ))}
        </ul>
      )}

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
        <button type="submit" className="btn-primary text-sm" disabled={submitting || !newText.trim()}>
          Add
        </button>
      </form>
    </section>
  )
}
