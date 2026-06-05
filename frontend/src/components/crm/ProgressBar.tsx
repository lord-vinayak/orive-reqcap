interface ProgressBarProps {
  value: number     // 0-100
  label?: string
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, label, size = 'md' }: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 100)
  const height = size === 'sm' ? 'h-2' : 'h-3'

  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-black/60 dark:text-slate-400 mb-1">
          <span>{label}</span>
          <span aria-label={`${pct}% complete`}>{pct}%</span>
        </div>
      )}
      <div
        className={`w-full bg-black/10 dark:bg-white/10 rounded-full ${height}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label}: ${pct}%` : `${pct}% complete`}
      >
        <div
          className={`${height} rounded-full transition-all duration-300 bg-gradient-to-r ${pct === 100 ? 'from-emerald-500 to-teal-600' : 'from-mustard to-amber-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!label && size === 'md' && (
        <div className="text-right text-xs text-black/60 dark:text-slate-400 mt-0.5">{pct}%</div>
      )}
    </div>
  )
}
