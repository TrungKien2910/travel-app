'use client'

interface ProgressRingProps {
  done: number
  total: number
  size?: number
}

export function ProgressRing({ done, total, size = 120 }: ProgressRingProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const stroke = 10
  const radius = (size - stroke - 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E3F1F5"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#0E7C9D"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-2xl font-bold text-ink">{pct}%</div>
        <div className="text-xs text-muted-foreground">
          {done}/{total} điểm
        </div>
      </div>
    </div>
  )
}
