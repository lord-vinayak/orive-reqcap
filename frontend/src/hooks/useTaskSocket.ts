import { useEffect, useRef } from 'react'
import type { TaskItem } from '@/types/crm'
import { useAuthStore } from '@/store/authStore'

// Derive the WebSocket URL from VITE_API_URL so it always points at the
// Django backend (Railway), not at the frontend host (Vercel).
function buildWsUrl(token: string | null): string {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000'
  const proto = apiUrl.startsWith('https') ? 'wss:' : 'ws:'
  const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${proto}//${host}/ws/tasks/${query}`
}

export function useTaskSocket(onUpdate: (task: TaskItem) => void) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!accessToken) return

    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let destroyed = false

    const connect = () => {
      if (destroyed) return
      ws = new WebSocket(buildWsUrl(accessToken))

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
  }, [accessToken])
}
