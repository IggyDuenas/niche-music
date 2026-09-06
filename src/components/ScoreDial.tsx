type Props = { score: number; percentile: number; label: string };

/**
 * Semicircular gauge. The arc is drawn with a stroke-dasharray offset rather
 * than a path per value so the fill animates smoothly when the score changes.
 */
export function ScoreDial({ score, percentile, label }: Props) {
  const radius = 92;
  const circumference = Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 130" className="w-full max-w-[320px]" role="img"
           aria-label={`Niche score ${score} out of 100`}>
        <defs>
          <linearGradient id="dial" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-hot)" />
            <stop offset="55%" stopColor="#ffd166" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
        <path
          d="M 18 112 A 92 92 0 0 1 202 112"
          fill="none"
          stroke="var(--color-edge)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 18 112 A 92 92 0 0 1 202 112"
          fill="none"
          stroke="url(#dial)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
        <text
          x="110" y="98" textAnchor="middle"
          className="nums fill-[var(--color-chalk)] text-[46px] font-bold"
        >
          {Math.round(score)}
        </text>
        <text x="110" y="120" textAnchor="middle" className="fill-[var(--color-muted)] text-[11px]">
          niche score / 100
        </text>
      </svg>

      <p className="mt-3 text-2xl font-semibold tracking-tight">{label}</p>
      <p className="nums mt-1 text-sm text-[var(--color-muted)]">
        More obscure than about {percentile}% of listeners
      </p>
    </div>
  );
}
