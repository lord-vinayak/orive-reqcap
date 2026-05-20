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
  // Keep accumulated final text in a ref so it survives across renders
  const finalTextRef = useRef('')

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
    rec.lang = 'en-US'

    finalTextRef.current = ''
    setTranscript('')
    setError(null)

    rec.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTextRef.current += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setTranscript(finalTextRef.current + interim)
    }

    rec.onerror = (e: any) => {
      // 'no-speech' is benign — user just didn't say anything yet
      if (e.error === 'no-speech') return
      setError(`Recognition error: ${e.error}`)
      setIsRecording(false)
    }

    rec.onend = () => {
      // Ensure state transcript has the final accumulated text before flipping isRecording
      setTranscript(finalTextRef.current.trim())
      setIsRecording(false)
    }

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
    finalTextRef.current = ''
  }, [])

  useEffect(() => () => { recRef.current?.abort?.() }, [])

  return { isSupported, isRecording, transcript, error, start, stop, reset }
}
