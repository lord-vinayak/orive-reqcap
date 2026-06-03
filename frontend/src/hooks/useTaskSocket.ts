import { useEffect, useRef } from 'react'
import type { TaskItem } from '@/types/crm'

// Derive the WebSocket URL from VITE_API_URL so it always points at the
// Django backend (Railway), not at the frontend host (Vercel).
function buildWsUrl(): string {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000'
  const proto = apiUrl.startsWith('https') ? 'wss:' : 'ws:'
  const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `${proto}//${host}/ws/tasks/`
}

const WS_URL = buildWsUrl()

export function useTaskSocket(onUpdate: (task: TaskItem) => void) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let destroyed = false

    const connect = () => {
      if (destroyed) return
      ws = new WebSocket(WS_URL)

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TaskItem
          onUpdateRef.current(data)
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, 3000)
        }
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      destroyed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [])
}
