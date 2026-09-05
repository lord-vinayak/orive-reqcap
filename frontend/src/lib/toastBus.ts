type Listener = (message: string) => void

const listeners = new Set<Listener>()

export function emitToast(message: string) {
  listeners.forEach((cb) => cb(message))
}

export function subscribe(cb: Listener) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
