import type { ScoredTrack } from "@/lib/types";

function compact(value: number | undefined): string {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-[var(--color-accent)]";
  if (score >= 40) return "text-[#ffd166]";
  return "text-[var(--color-hot)]";
}

export function TrackList({ tracks, emptyNote }: { tracks: ScoredTrack[]; emptyNote: string }) {
  if (tracks.length === 0) {
    return <p className="text-sm text-[var(--color-muted)]">{emptyNote}</p>;
  }

  return (
    <ol className="divide-y divide-[var(--color-edge)]">
      {tracks.map((track, index) => (
        <li key={`${track.id}-${index}`} className="flex items-center gap-3 py-2.5">
          <span className="nums w-5 shrink-0 text-xs text-[var(--color-muted)]">{index + 1}</span>
          {track.artworkUrl ? (
            // Plain img: artwork hosts vary per provider and these are small.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.artworkUrl} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
          ) : (
            <div className="h-9 w-9 shrink-0 rounded bg-[var(--color-panel-2)]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{track.title}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">{track.artist}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`nums text-sm font-semibold ${scoreColor(track.nicheScore)}`}>
              {Math.round(track.nicheScore)}
            </p>
            <p className="nums text-[11px] text-[var(--color-muted)]">
              {compact(track.stats.trackListeners)} listeners
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
