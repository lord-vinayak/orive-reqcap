import React, { useState } from 'react'
import type { StageStatusResponse, InternalTeamMember, ProjectFile } from '@/types/crm'
import { StageCheckbox } from './StageCheckbox'
import ResampleModal from './ResampleModal'

interface Props {
  stageStatus: StageStatusResponse
  projectId: string
  activeStageKey: string | null
  setActiveStageKey: (key: string) => void
  onCompleteStage: (key: string, complete: boolean) => Promise<void>
  onApproveSample: (approved: boolean | 'other', reason?: string) => Promise<void>
  onSetOrderGate: (data: { order_booking_steps: Record<string, boolean>; order_booked: boolean }) => Promise<void>
  saving: boolean
  teamMembers?: InternalTeamMember[]
  onAssign?: (key: string, memberId: string, comment?: string) => Promise<void>
  onUpload?: (stageKey: string, file: File) => Promise<void>
  files?: ProjectFile[]
}

export function SamplePhaseView({
  stageStatus, projectId: _projectId, activeStageKey, setActiveStageKey,
  onCompleteStage, onApproveSample, onSetOrderGate, saving,
  teamMembers = [], onAssign, onUpload, files = [],
}: Props) {
  const { sample_phase, order_booking_steps, order_booked, sample_phase_complete, sample_rejected, resample_cycle, max_cycles, resample_notes } = stageStatus

  return (
    <div className="space-y-6">
      {/* Pre-loop section */}
      <StageSection
        title="Initial Steps"
        stages={sample_phase.pre_loop}
        activeKey={activeStageKey}
        setActiveKey={setActiveStageKey}
        onToggle={onCompleteStage}
        saving={saving}
        teamMembers={teamMembers}
        onAssign={onAssign}
        onUpload={onUpload}
      />

      {/* Resample cycles */}
      {sample_phase.loop_cycles.map((cycle) => (
        <div key={cycle.cycle} className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-black dark:text-white">
              Sample Development — Attempt {cycle.cycle}
            </h3>
            {cycle.cycle > 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Resample {cycle.cycle} of {max_cycles}
              </span>
            )}
            {!cycle.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                Not Approved
              </span>
            )}
          </div>

          {cycle.is_active ? (
            <div
              className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden"
              role="region"
              aria-label={`Sample attempt ${cycle.cycle}`}
            >
              {cycle.stages.map((stage) =>
                stage.is_approval_gate ? (
                  <ApprovalGate
                    key={stage.key}
                    stage={stage}
                    cycle={cycle.cycle}
                    maxCycles={max_cycles}
                    sampleRejected={sample_rejected}
                    onApprove={onApproveSample}
                    saving={saving}
                  />
                ) : (
                  <div
                    key={stage.key}
                    onClick={() => !stage.is_locked && setActiveStageKey(stage.key)}
                    className={`cursor-pointer ${activeStageKey === stage.key ? 'ring-2 ring-inset ring-mustard' : ''}`}
                  >
                    <StageCheckbox
                      stage={stage} onToggle={onCompleteStage} saving={saving}
                      teamMembers={teamMembers} onAssign={onAssign} onUpload={onUpload}
                    />
                  </div>
                )
              )}
            </div>
          ) : (
            // Collapsed past cycle — show resample reason if recorded
            <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-3 text-sm text-black/50 dark:text-slate-400 italic">
                Attempt {cycle.cycle} — sample was not approved, resampling initiated
              </div>
              {resample_notes?.[String(cycle.cycle)] && (
                <div className="border-t border-black/5 dark:border-white/5 px-4 py-3 bg-amber-50/60 dark:bg-amber-900/10">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Resample Reason</p>
                  <p className="text-sm text-black dark:text-white">{resample_notes[String(cycle.cycle)].reason}</p>
                  {resample_notes[String(cycle.cycle)].author_name && (
                    <p className="text-xs text-black/40 dark:text-slate-500 mt-1">
                      — {resample_notes[String(cycle.cycle)].author_name}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Post-approval */}
      {sample_phase.show_post_approval && (
        <StageSection
          title="After Sample Approval"
          stages={sample_phase.post_approval}
          activeKey={activeStageKey}
          setActiveKey={setActiveStageKey}
          onToggle={onCompleteStage}
          saving={saving}
          teamMembers={teamMembers}
          onAssign={onAssign}
          onUpload={onUpload}
        />
      )}

      {/* Order gate */}
      {sample_phase_complete && (
        <OrderGate
          steps={order_booking_steps}
          orderBooked={order_booked}
          onSave={onSetOrderGate}
          saving={saving}
          files={files}
          onUpload={onUpload}
        />
      )}
    </div>
  )
}

// ── Stage section wrapper ─────────────────────────────────────────────────────

function StageSection({
  title, stages, activeKey, setActiveKey, onToggle, saving, teamMembers, onAssign, onUpload,
}: {
  title: string
  stages: StageStatusResponse['sample_phase']['pre_loop']
  activeKey: string | null
  setActiveKey: (k: string) => void
  onToggle: (k: string, v: boolean) => Promise<void>
  saving: boolean
  teamMembers?: InternalTeamMember[]
  onAssign?: (key: string, memberId: string, comment?: string) => Promise<void>
  onUpload?: (stageKey: string, file: File) => Promise<void>
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-black dark:text-white mb-2">{title}</h3>
      <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden" role="list">
        {stages.map((stage) => (
          <div
            key={stage.key}
            role="listitem"
            onClick={() => !stage.is_locked && setActiveKey(stage.key)}
            className={`cursor-pointer ${activeKey === stage.key ? 'ring-2 ring-inset ring-mustard' : ''}`}
          >
            <StageCheckbox
              stage={stage} onToggle={onToggle} saving={saving}
              teamMembers={teamMembers} onAssign={onAssign} onUpload={onUpload}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sample approval gate ──────────────────────────────────────────────────────

function ApprovalGate({
  stage, cycle, maxCycles, sampleRejected, onApprove, saving,
}: {
  stage: StageStatusResponse['sample_phase']['pre_loop'][number]
  cycle: number
  maxCycles: number
  sampleRejected?: boolean
  onApprove: (approved: boolean | 'other', reason?: string) => Promise<void>
  saving: boolean
}) {
  const [confirmingYes, setConfirmingYes] = useState(false)
  const [showResampleModal, setShowResampleModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const canResample = cycle < maxCycles

  if (stage.is_complete) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-green-50 dark:bg-green-900/10">
        <span className="text-green-600 dark:text-green-400 text-lg" aria-hidden="true">✓</span>
        <div>
          <p className="text-sm font-medium text-green-700 dark:text-green-300">Sample Approved</p>
          {stage.completed_by_name && (
            <p className="text-xs text-black/40 dark:text-slate-500">
              by {stage.completed_by_name}
              {stage.completed_at && <> · {new Date(stage.completed_at).toLocaleDateString('en-IN')}</>}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (sampleRejected) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-red-50 dark:bg-red-900/10">
        <span className="text-red-600 dark:text-red-400 text-lg" aria-hidden="true">✕</span>
        <p className="text-sm font-medium text-red-700 dark:text-red-300">
          Sample Rejected by Client — no resample requested
        </p>
      </div>
    )
  }

  if (stage.is_locked) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 opacity-50">
        <span className="text-black/30 dark:text-slate-600 text-lg" aria-hidden="true">○</span>
        <p className="text-sm text-black/50 dark:text-slate-500">Sample Approved? (complete previous steps first)</p>
      </div>
    )
  }

  return (
    <>
      <div
        className="px-3 py-3 border-t border-black/5 dark:border-white/5 bg-amber-50/50 dark:bg-amber-900/10"
        role="group"
        aria-label="Sample approval decision"
      >
        <p className="text-sm font-medium text-black dark:text-white mb-2">
          Sample Approved by Client?
        </p>
        {!confirmingYes ? (
          <div className="flex gap-2" role="radiogroup" aria-label="Approval decision">
            <button
              type="button"
              onClick={() => setConfirmingYes(true)}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-mustard"
            >
              Yes — Approved
            </button>
            <button
              type="button"
              onClick={() => setShowResampleModal(true)}
              disabled={saving || !canResample}
              title={!canResample ? 'Maximum resample cycles reached' : undefined}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-mustard"
            >
              No — Resample
            </button>
            {!canResample && (
              <p className="text-xs text-red-600 dark:text-red-400 self-center" role="alert">
                Max {maxCycles} cycles reached
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              disabled={saving}
              title="Client rejected the sample and doesn't want a resample"
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-black/70 text-white hover:bg-black/80 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-mustard"
            >
              Others — Rejected
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm text-black/70 dark:text-slate-300">Confirm sample is approved?</p>
            <button
              type="button"
              onClick={async () => { await onApprove(true); setConfirmingYes(false) }}
              disabled={saving}
              className="px-3 py-1 rounded text-xs font-semibold bg-mustard text-black hover:bg-mustard/80 disabled:opacity-50"
            >
              {saving ? '…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingYes(false)}
              disabled={saving}
              className="px-3 py-1 rounded text-xs text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {showResampleModal && (
        <ResampleModal
          cycleFrom={cycle}
          onConfirm={async (reason) => {
            await onApprove(false, reason)
            setShowResampleModal(false)
          }}
          onClose={() => setShowResampleModal(false)}
        />
      )}

      {showRejectModal && (
        <ResampleModal
          cycleFrom={cycle}
          mode="reject"
          onConfirm={async (reason) => {
            await onApprove('other', reason)
            setShowRejectModal(false)
          }}
          onClose={() => setShowRejectModal(false)}
        />
      )}
    </>
  )
}

// ── Order gate ────────────────────────────────────────────────────────────────

const ORDER_BOOKING_STEPS: { key: string; label: string }[] = [
  { key: 'invoice_shared',        label: 'Invoice Shared' },
  { key: 'order_booked_substage', label: 'Order Booked' },
  { key: 'mou_shared',            label: 'MOU shared with the client' },
  { key: 'mou_signed',            label: 'MOU signed by client' },
  { key: 'trademark_gst',         label: 'Trade Mark + GST Details received from client' },
  { key: 'fda_client_created',    label: 'FDA document created for client' },
  { key: 'fda_client_shared',     label: 'FDA document shared with client' },
  { key: 'fda_manufacturer',      label: 'FDA document created and shared with manufacturer' },
]

function OrderGate({
  steps, orderBooked, onSave, saving, files, onUpload,
}: {
  steps: Record<string, boolean>
  orderBooked: boolean
  onSave: (data: { order_booking_steps: Record<string, boolean>; order_booked: boolean }) => Promise<void>
  saving: boolean
  files: ProjectFile[]
  onUpload?: (stageKey: string, file: File) => Promise<void>
}) {
  const [localSteps, setLocalSteps] = useState<Record<string, boolean>>(steps)
  const [localBooked, setLocalBooked] = useState(orderBooked)
  const [saving2, setSaving2] = useState(false)

  if (orderBooked) {
    return (
      <div className="border-2 border-green-500 rounded-xl p-4 bg-green-50 dark:bg-green-900/10">
        <div className="flex items-center gap-2">
          <span className="text-green-600 dark:text-green-400 text-xl" aria-hidden="true">🎉</span>
          <p className="font-semibold text-green-700 dark:text-green-300">Order Booked — Move to Production Phase</p>
        </div>
      </div>
    )
  }

  const toggle = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setLocalSteps((prev) => ({ ...prev, [key]: e.target.checked }))

  const handleSave = async () => {
    setSaving2(true)
    try {
      await onSave({ order_booking_steps: localSteps, order_booked: localBooked })
    } finally {
      setSaving2(false)
    }
  }

  return (
    <div
      className="border-2 border-mustard rounded-xl p-5 bg-mustard/5 dark:bg-mustard/5 space-y-4"
      role="region"
      aria-label="Order booking gate"
    >
      <h3 className="font-semibold text-black dark:text-white">Order Booking</h3>
      <p className="text-sm text-black/60 dark:text-slate-400">
        Sample has been approved. Complete the steps below to unlock the production phase.
      </p>

      <div className="space-y-2">
        {ORDER_BOOKING_STEPS.map(({ key, label }) => (
          <OrderStepRow
            key={key}
            stepKey={key}
            label={label}
            checked={!!localSteps[key]}
            onToggle={toggle(key)}
            disabled={saving || saving2}
            files={files.filter((f) => f.stage_key === key)}
            onUpload={onUpload}
          />
        ))}
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-black dark:text-white mb-2">Order Booked?</legend>
        <div className="flex gap-3" role="radiogroup">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="order-booked"
              value="yes"
              checked={localBooked === true}
              onChange={() => setLocalBooked(true)}
              disabled={saving || saving2}
              className="accent-mustard"
              aria-label="Yes, order is booked"
            />
            <span className="text-sm text-black dark:text-white">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="order-booked"
              value="no"
              checked={localBooked === false}
              onChange={() => setLocalBooked(false)}
              disabled={saving || saving2}
              className="accent-mustard"
              aria-label="No, order not yet booked"
            />
            <span className="text-sm text-black dark:text-white">No</span>
          </label>
        </div>
      </fieldset>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || saving2}
        className="btn-primary text-sm disabled:opacity-50"
      >
        {saving2 ? 'Saving…' : 'Save Order Status'}
      </button>
    </div>
  )
}

// ── Order booking step row (checkbox + attach + inline file list) ─────────────

function OrderStepRow({
  stepKey, label, checked, onToggle, disabled, files, onUpload,
}: {
  stepKey: string
  label: string
  checked: boolean
  onToggle: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled: boolean
  files: ProjectFile[]
  onUpload?: (stageKey: string, file: File) => Promise<void>
}) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            disabled={disabled}
            className="w-4 h-4 accent-mustard"
          />
          <span className="text-sm text-black dark:text-white">{label}</span>
        </label>

        {onUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploading(true)
                try { await onUpload(stepKey, file) } finally {
                  setUploading(false)
                  e.target.value = ''
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs px-2 py-0.5 rounded border border-black/15 dark:border-white/15 text-black/50 dark:text-slate-400 hover:border-mustard hover:text-mustard transition-colors focus-visible:ring-2 focus-visible:ring-mustard disabled:opacity-50 shrink-0"
              aria-label={`Attach file to ${label}`}
            >
              {uploading ? '…' : '📎'}
            </button>
          </>
        )}
      </div>

      {files.length > 0 && (
        <ul className="pl-6 space-y-0.5">
          {files.map((f) => (
            <li key={f.id}>
              <a
                href={f.drive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-mustard hover:underline inline-flex items-center gap-1"
              >
                <span aria-hidden="true">📎</span> {f.filename}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
