import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Client } from '@/types'
import {
  LEAD_STATUS_COLOR, LEAD_STATUS_OPTIONS, LEAD_SUB_STATUS_OPTIONS,
  formatLeadStatus, type LeadStatus,
} from '@/constants/clientStatus'
import { clientService } from '@/services'

interface Props {
  client: Pick<Client, 'phone_no' | 'lead_status' | 'lead_sub_status'>
  onUpdated?: (patch: { lead_status: LeadStatus; lead_sub_status: string }) => void
  readOnly?: boolean
}

export function LeadStatusBadge({ client, onUpdated, readOnly = false }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'status' | 'sub'>('status')
  const [pendingStatus, setPendingStatus] = useState<LeadStatus>(client.lead_status)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuContainerRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUpward: boolean } | null>(null)

  // Position the menu in the viewport (via a portal) so it can't be clipped by a
  // scrollable ancestor like a table wrapper with overflow-x-auto.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) { setMenuPos(null); return }
    const rect = triggerRef.current.getBoundingClientRect()
    const openUpward = rect.bottom + 320 > window.innerHeight && rect.top > 320
    setMenuPos({
      top: openUpward ? rect.top : rect.bottom,
      left: rect.left,
      openUpward,
    })
  }, [open, step])

  // Focus first menu item once the portal has actually mounted (menuPos set); return
  // focus to trigger when closed. Keying on `open` alone fires before the portal
  // exists, since menuPos (and thus the portal) lands one render later.
  const didOpen = useRef(false)
  useEffect(() => {
    if (open && menuPos) {
      didOpen.current = true
      const first = menuContainerRef.current?.querySelector<HTMLElement>('[role="menuitemradio"], [role="menuitem"]')
      first?.focus()
    } else if (!open && didOpen.current) {
      triggerRef.current?.focus()
    }
  }, [open, menuPos])

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePopover() }
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || menuContainerRef.current?.contains(target)) return
      closePopover()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [open])

  const closePopover = () => { setOpen(false); setStep('status'); setPendingStatus(client.lead_status) }

  const openPopover = () => {
    if (readOnly) return
    setPendingStatus(client.lead_status)
    setStep('status')
    setOpen(true)
  }

  const selectStatus = (s: LeadStatus) => {
    setPendingStatus(s)
    const hasSubs = (LEAD_SUB_STATUS_OPTIONS[s]?.length ?? 0) > 0
    if (hasSubs) {
      setStep('sub')
    } else {
      save(s, '')
    }
  }

  const selectSub = (sub: string) => save(pendingStatus, sub)

  const skipSub = () => save(pendingStatus, '')

  const save = async (ls: LeadStatus, lss: string) => {
    setSaving(true)
    try {
      await clientService.patch(client.phone_no, { lead_status: ls, lead_sub_status: lss })
      onUpdated?.({ lead_status: ls, lead_sub_status: lss })
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const colorCls = LEAD_STATUS_COLOR[client.lead_status] ?? LEAD_STATUS_COLOR.initial_conversation
  const label = formatLeadStatus(client.lead_status, client.lead_sub_status || undefined)
  const subOpts = LEAD_SUB_STATUS_OPTIONS[pendingStatus] ?? []

  return (
    <div className="relative inline-block" ref={ref}>
      {saving && <span className="sr-only" role="status" aria-live="polite">Saving lead status…</span>}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPopover}
        disabled={readOnly || saving}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Lead status: ${label}${readOnly ? '' : '. Click to change'}`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mustard focus-visible:ring-offset-1
          ${colorCls}
          ${readOnly ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}
          disabled:opacity-50`}
      >
        <span>{label}</span>
        {!readOnly && <span aria-hidden="true" className="opacity-50">▾</span>}
      </button>

      {open && menuPos && createPortal(
        <div
          ref={menuContainerRef}
          style={{
            position: 'fixed',
            top: menuPos.openUpward ? undefined : menuPos.top + 4,
            bottom: menuPos.openUpward ? window.innerHeight - menuPos.top + 4 : undefined,
            left: menuPos.left,
          }}
          className="z-50 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-xl shadow-xl w-64 py-1"
          onKeyDown={(e) => {
            const items = Array.from(
              menuContainerRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]:not(:disabled), [role="menuitem"]:not(:disabled)') ?? []
            )
            if (items.length === 0) return
            const idx = items.indexOf(document.activeElement as HTMLElement)
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              items[(idx + 1) % items.length]?.focus()
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              items[(idx - 1 + items.length) % items.length]?.focus()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              closePopover()
            }
          }}
        >
          {step === 'status' ? (
            <>
              <p className="px-3 py-1.5 text-xs font-semibold text-black/70 dark:text-slate-300 uppercase tracking-wide">
                Lead Status
              </p>
              <ul role="menu" aria-label="Lead status options">
                {LEAD_STATUS_OPTIONS.map((opt) => (
                  <li key={opt.value} role="none">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={opt.value === client.lead_status}
                      onClick={() => selectStatus(opt.value)}
                      disabled={saving}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mustard
                        ${opt.value === client.lead_status ? 'font-semibold text-black dark:text-white' : 'text-black/70 dark:text-slate-300'}`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${LEAD_STATUS_COLOR[opt.value].split(' ')[0]}`} aria-hidden="true" />
                      {opt.label}
                      {(LEAD_SUB_STATUS_OPTIONS[opt.value]?.length ?? 0) > 0 && (
                        <span className="ml-auto text-xs text-black/30 dark:text-slate-600" aria-hidden="true">›</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setStep('status')}
                  aria-label="Back to status selection"
                  className="text-xs text-black/70 dark:text-slate-300 hover:text-black dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mustard rounded"
                >
                  ← Back
                </button>
                <p className="text-xs font-semibold text-black/70 dark:text-slate-300 uppercase tracking-wide">
                  {LEAD_STATUS_OPTIONS.find((o) => o.value === pendingStatus)?.label} — Sub-status
                </p>
              </div>
              <ul role="menu" aria-label="Sub-status options">
                {subOpts.map((opt) => (
                  <li key={opt.value} role="none">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={opt.value === client.lead_sub_status}
                      onClick={() => selectSub(opt.value)}
                      disabled={saving}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mustard
                        ${opt.value === client.lead_sub_status ? 'font-semibold text-black dark:text-white' : 'text-black/70 dark:text-slate-300'}`}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-black/5 dark:border-white/5 px-3 py-1.5">
                <button
                  type="button"
                  onClick={skipSub}
                  disabled={saving}
                  className="text-xs text-black/70 dark:text-slate-300 hover:text-black dark:hover:text-white"
                >
                  Skip — no sub-status
                </button>
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
