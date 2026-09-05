import { useEffect, useState } from 'react'
import { subscribe } from '@/lib/toastBus'

export default function ReadOnlyToastHost() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    return subscribe((msg) => {
      setMessage(msg)
      setTimeout(() => setMessage(null), 3000)
    })
  }, [])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-gray-700"
    >
      {message}
    </div>
  )
}
