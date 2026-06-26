import { useEffect, useRef } from 'react'
import type { TaskItem } from '@/types/crm'

function buildWsUrl(token: string): string {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000'
  const proto = apiUrl.startsWith('https') ? 'wss:' : 'ws:'
  const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `${proto}//${host}/ws/tasks/?token=${token}`
}

export function useTaskSocket(onUpdate: (task: TaskItem) => void, token: string | null) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!token) return  // ponytail: skip entirely when logged out — no token, no socket

    const WS_URL = buildWsUrl(token)
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
  }, [token])
}
