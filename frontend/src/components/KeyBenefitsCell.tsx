import { useEffect, useRef, useState } from 'react'
import { KEY_BENEFITS } from '@/utils/dropdownOptions'

interface Props {
  bodyPart: string
  value: string[]
  onChange: (next: string[]) => void
}

/** Compact multi-select for the Key Benefits cell.
 *  Shows count + comma list; opens a popover with checkboxes when clicked. */
export default function KeyBenefitsCell({ bodyPart, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const options = bodyPart ? KEY_BENEFITS[bodyPart] || [] : []

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (kb: string) => {
    onChange(value.includes(kb) ? value.filter((x) => x !== kb) : [...value, kb])
  }

  const summary = value.length === 0 ? '—' : value.join(', ')

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={!bodyPart}
        className="w-full text-left px-2 py-1 border border-black/15 rounded bg-white text-sm truncate hover:border-mustard disabled:bg-black/[0.04] disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={summary}
      >
        {summary}
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-1 w-56 max-h-60 overflow-auto bg-white border border-black/15 rounded shadow-lg p-2"
        >
          {options.length === 0 ? (
            <p className="text-xs text-black/50 p-2">Select a body part first.</p>
          ) : options.map((kb) => (
            <label key={kb} className="flex items-center gap-2 px-2 py-1 hover:bg-mustard-50 rounded cursor-pointer text-sm">
              <input
                type="checkbox"
                className="accent-mustard"
                checked={value.includes(kb)}
                onChange={() => toggle(kb)}
              />
              <span>{kb}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
