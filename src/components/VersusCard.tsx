import type { ShareCard } from "@/lib/share";
import { MiniSleeve } from "@/components/FigureGrid";
import { colorwayFor } from "@/lib/colorways";

function compact(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function VersusCard({
  card,
  outcome,
}: {
  card: ShareCard;
  /** Left null while there is nothing to compare against yet. */
  outcome: "win" | "loss" | "tie" | null;
}) {
  const border =
    outcome === "win" ? "border-[var(--color-cream)]" : "border-[rgba(236,233,214,0.14)]";

  return (
    <div className={`panel flex h-full flex-col border-2 p-6 ${border}`}>
      <div className="flex items-center gap-3">
        {/* Each playlist wears its own pressing, so two cards never look alike. */}
        <MiniSleeve
          art={colorwayFor(card.n).art}
          ink={colorwayFor(card.n).artInk}
          size={4}
          className="h-14 w-14 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
            {card.o}
          </p>
          <h2 className="mt-0.5 truncate text-lg font-semibold" title={card.n}>
            {card.n}
          </h2>
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="nums text-5xl font-bold">{Math.round(card.s)}</span>
        <span className="text-sm text-[var(--color-muted)]">/ 100</span>
        {outcome === "win" && (
          <span className="ml-auto rounded-full bg-[var(--color-cream)] px-2.5 py-1 text-xs font-bold text-[var(--color-ink)]">
            Winner
          </span>
        )}
        {outcome === "tie" && (
          <span className="ml-auto rounded-full border border-[rgba(236,233,214,0.2)] px-2.5 py-1 text-xs font-semibold">
            Tie
          </span>
        )}
      </div>

      <p className="mt-1 text-sm font-medium text-[var(--color-gold)]">{card.v}</p>

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-[rgba(236,233,214,0.12)] pt-4 text-center">
        <div>
          <dt className="text-[11px] text-[var(--color-muted)]">tracks</dt>
          <dd className="nums text-sm font-semibold">{card.t}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--color-muted)]">deep cuts</dt>
          <dd className="nums text-sm font-semibold">{card.d}%</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--color-muted)]">median plays</dt>
          <dd className="nums text-sm font-semibold">{compact(card.m)}</dd>
        </div>
      </dl>

      {card.h.length > 0 && (
        <div className="mt-4 border-t border-[rgba(236,233,214,0.12)] pt-4">
          <p className="text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
            Deepest cuts
          </p>
          <ul className="mt-2 space-y-1.5">
            {card.h.map(([title, artist, score], index) => (
              <li key={`${title}-${index}`} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-xs">
                  {title} <span className="text-[var(--color-muted)]">— {artist}</span>
                </span>
                <span className="nums shrink-0 text-xs text-[var(--color-cream)]">{score}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
