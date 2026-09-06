import type { Round } from "@/lib/share";
import { SERIES, formatValue } from "./series";

/**
 * One paired bar per round. Each row is its own small chart with its own scale:
 * the rounds are in different units — a score, a percentage, a listener count —
 * so they must never share a single axis.
 */
export function Rounds({ rounds, nameA, nameB }: { rounds: Round[]; nameA: string; nameB: string }) {
  return (
    <div>
      <Legend nameA={nameA} nameB={nameB} />
      <table className="mt-5 w-full border-collapse">
        <caption className="sr-only">
          {nameA} against {nameB}, round by round
        </caption>
        <tbody>
          {rounds.map((round) => (
            <Row key={round.key} round={round} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ round }: { round: Round }) {
  // Each row scales to its own larger value, so both bars stay readable
  // whatever the unit happens to be.
  const ceiling = Math.max(round.a, round.b, 1);

  return (
    <tr className="border-t border-[rgba(236,233,214,0.1)] align-top">
      <th scope="row" className="max-w-[11rem] py-3.5 pr-4 text-left">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-[var(--color-cream)]">{round.label}</span>
          {/*
           * On these rows the longer bar is the worse result. Bars stay honest
           * magnitudes, so the direction has to be said outright — otherwise
           * "longer is better" quietly misreads half the table.
           */}
          {round.lowerWins && (
            <span className="rounded-full border border-[rgba(236,233,214,0.24)] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              ↓ lower wins
            </span>
          )}
        </span>
        <span className="mt-1 block text-[11px] leading-snug text-[var(--color-muted)]">
          {round.hint}
        </span>
      </th>
      <td className="w-1/2 py-3.5">
        <Bar
          width={(round.a / ceiling) * 100}
          color={SERIES.a}
          value={formatValue(round.a, round.unit)}
          won={round.winner === "a"}
        />
        <div className="h-1" />
        <Bar
          width={(round.b / ceiling) * 100}
          color={SERIES.b}
          value={formatValue(round.b, round.unit)}
          won={round.winner === "b"}
        />
      </td>
    </tr>
  );
}

function Bar({ width, color, value, won }: { width: number; color: string; value: string; won: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 min-w-0 flex-1 rounded-full bg-[rgba(236,233,214,0.09)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, width)}%`, backgroundColor: color }}
        />
      </div>
      <span className="nums w-16 shrink-0 text-right text-xs text-[var(--color-cream)]">
        {value}
        {/* Identity is never colour alone — the winner is marked in text too. */}
        {won && <span className="ml-1" aria-label="wins this round">✦</span>}
      </span>
    </div>
  );
}

export function Legend({ nameA, nameB }: { nameA: string; nameB: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <LegendItem color={SERIES.a} name={nameA} />
      <LegendItem color={SERIES.b} name={nameB} />
      <span className="text-[var(--color-muted)]">✦ wins the round</span>
    </div>
  );
}

function LegendItem({ color, name }: { color: string; name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="max-w-[10rem] truncate text-[var(--color-cream)]">{name}</span>
    </span>
  );
}
