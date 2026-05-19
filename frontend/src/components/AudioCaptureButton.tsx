import { useEffect } from 'react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { audioService } from '@/services'
import type { RequirementProduct } from '@/types'

interface Props {
  onExtract: (fields: Partial<RequirementProduct>) => void
}

export default function AudioCaptureButton({ onExtract }: Props) {
  const { isSupported, isRecording, transcript, error, start, stop } = useSpeechRecognition()

  useEffect(() => {
    if (!isRecording && transcript.trim()) {
      // Recording stopped + we have a transcript -> extract
      audioService.extract(transcript).then((res) => {
        if (res.fields) onExtract(res.fields)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording])

  if (!isSupported) {
    return (
      <div className="text-xs text-black/50" role="status">
        Audio capture requires Chrome browser.
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-red-700" aria-live="polite">
          <span className="w-2.5 h-2.5 bg-red-700 rounded-full animate-pulse" aria-hidden="true" />
          Recording…
        </div>
      )}
      <button
        type="button"
        onClick={isRecording ? stop : start}
        className={isRecording ? 'btn-danger' : 'btn-primary'}
        aria-pressed={isRecording}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? 'Stop Recording' : '🎙 Start Audio Capture'}
      </button>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </div>
  )
}
