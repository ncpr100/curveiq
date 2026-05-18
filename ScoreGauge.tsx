interface Props {
  score: number;
  delta?: number;
  size?: number;
}

export function ScoreGauge({ score, delta, size = 220 }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const tier =
    clamped >= 90 ? "Exceptional" : clamped >= 80 ? "Harmonious" : clamped >= 70 ? "Balanced" : "Refinable";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.78 0.1 40)" />
            <stop offset="100%" stopColor="oklch(0.62 0.13 25)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.92 0.01 80)"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">CHI</span>
        <span className="text-5xl font-light tabular-nums text-foreground">{clamped.toFixed(1)}</span>
        <span className="mt-1 text-xs font-medium text-foreground">{tier}</span>
        {delta != null && Math.abs(delta) > 0.05 ? (
          <span
            className={`mt-1 text-xs font-medium tabular-nums ${
              delta > 0 ? "text-[oklch(0.55_0.13_150)]" : "text-destructive"
            }`}
          >
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
