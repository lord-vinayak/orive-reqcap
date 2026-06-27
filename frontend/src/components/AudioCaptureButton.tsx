import { useEffect, useRef, useState } from 'react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { audioService } from '@/services'
import type { RequirementProduct } from '@/types'

interface Props {
  onExtract: (fields: Partial<RequirementProduct>) => void
}

export default function AudioCaptureButton({ onExtract }: Props) {
  const { isSupported, isRecording, transcript, error, start, stop } = useSpeechRecognition()
  const [extracting, setExtracting] = useState(false)
  const [extractMsg, setExtractMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  // Always hold the latest transcript in a ref so the effect never reads stale state
  const transcriptRef = useRef(transcript)
  transcriptRef.current = transcript

  // Always hold the latest onExtract callback in a ref to avoid stale closure
  const onExtractRef = useRef(onExtract)
  onExtractRef.current = onExtract

  // Trigger extraction the moment recording stops and transcript is non-empty
  const wasRecordingRef = useRef(false)
  useEffect(() => {
    if (isRecording) {
      wasRecordingRef.current = true
      setExtractMsg(null)
      setStatusMsg('Recording…')
      return
    }
    // Fired on transition: recording → stopped
    if (!wasRecordingRef.current) return
    wasRecordingRef.current = false

    const text = transcriptRef.current.trim()
    if (!text) return

    setExtracting(true)
    setExtractMsg(null)
    setStatusMsg('Extracting product details from your recording…')
    audioService.extract(text)
      .then((res) => {
        if (res.fields && Object.keys(res.fields).length > 0) {
          onExtractRef.current(res.fields)
          setExtractMsg({ text: 'Fields filled from audio.', ok: true })
          setStatusMsg('Fields filled from audio.')
        } else {
          setExtractMsg({ text: 'No fields recognised — fill manually.', ok: false })
          setStatusMsg('No fields recognised — fill manually.')
        }
      })
      .catch(() => {
        setExtractMsg({ text: 'Audio extraction failed. Please fill the fields manually.', ok: false })
        setStatusMsg('Audio extraction failed. Please fill the fields manually.')
      })
      .finally(() => {
        setExtracting(false)
        setTimeout(() => { setExtractMsg(null); setStatusMsg('') }, 4000)
      })
  }, [isRecording])

  if (!isSupported) {
    return (
      <div className="text-xs text-black/70" role="status">
        Audio capture requires Chrome browser.
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div role="status" aria-live="polite" className="sr-only">{statusMsg}</div>
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-red-700" aria-hidden="true">
          <span className="w-2.5 h-2.5 bg-red-700 rounded-full animate-pulse" aria-hidden="true" />
          Recording…
        </div>
      )}
      {isRecording && transcript && (
        <span className="text-xs text-black/70 max-w-xs truncate" aria-hidden="true">
          {transcript}
        </span>
      )}
      {extracting && (
        <span className="text-xs text-black/70" aria-hidden="true">Extracting fields…</span>
      )}
      {extractMsg && (
        <span
          aria-hidden="true"
          className={`text-xs ${extractMsg.ok ? 'text-green-700' : 'text-amber-700'}`}
        >
          {extractMsg.text}
        </span>
      )}
      <button
        type="button"
        onClick={isRecording ? stop : start}
        disabled={extracting}
        className={isRecording ? 'btn-danger' : 'btn-primary'}
        aria-pressed={isRecording}
        aria-label={isRecording ? 'Stop recording (Alt+R)' : 'Start audio capture (Alt+R)'}
        data-audio-capture-btn
        title={isRecording ? 'Stop recording — Alt+R' : 'Start audio capture — Alt+R'}
      >
        {isRecording ? 'Stop Recording' : '🎙 Start Audio Capture'}
      </button>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </div>
  )
}
