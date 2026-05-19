import { useEffect, useRef } from 'react'

/** Debounce a callback. Re-fires only after delay ms of no calls. */
export function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delay: number) {
  const timerRef = useRef<number | null>(null)
  const fnRef = useRef(fn)
  useEffect(() => { fnRef.current = fn })

  return ((...args: Parameters<T>) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => { fnRef.current(...args) }, delay)
  }) as T
}
