import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const options = bodyPart ? KEY_BENEFITS[bodyPart] || [] : []

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        wrapperRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: 224,
        zIndex: 9999,
      })
    }
    setOpen((o) => !o)
  }

  const toggle = (kb: string) => {
    onChange(value.includes(kb) ? value.filter((x) => x !== kb) : [...value, kb])
  }

  const summary = value.length === 0 ? '—' : value.join(', ')

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        disabled={!bodyPart}
        className="w-full text-left px-2 py-1 border border-black/15 rounded bg-white text-sm truncate hover:border-mustard disabled:bg-black/[0.04] disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={summary}
      >
        {summary}
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          role="listbox"
          aria-multiselectable="true"
          style={dropdownStyle}
          className="max-h-60 overflow-auto bg-white border border-black/15 rounded shadow-lg p-2"
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
        </div>,
        document.body,
      )}
    </div>
  )
}
