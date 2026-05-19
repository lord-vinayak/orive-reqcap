import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionResult {
  isSupported: boolean
  isRecording: boolean
  transcript: string
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: any
    webkitSpeechRecognition?: any
  }
}

export function useSpeechRecognition(): SpeechRecognitionResult {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<any>(null)

  const isSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const start = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Please use Chrome.')
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-IN'

    let finalText = ''
    rec.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setTranscript(finalText + interim)
    }
    rec.onerror = (e: any) => {
      setError(`Recognition error: ${e.error}`)
      setIsRecording(false)
    }
    rec.onend = () => {
      setIsRecording(false)
    }

    setTranscript('')
    setError(null)
    setIsRecording(true)
    rec.start()
    recRef.current = rec
  }, [isSupported])

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  useEffect(() => () => { recRef.current?.abort?.() }, [])

  return { isSupported, isRecording, transcript, error, start, stop, reset }
}
