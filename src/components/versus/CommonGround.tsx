import type { Verdict } from "@/lib/share";
import { SERIES } from "./series";

/** What the two playlists share, and what only one of them has. */
export function CommonGround({
  verdict,
  nameA,
  nameB,
}: {
  verdict: Verdict;
  nameA: string;
  nameB: string;
}) {
  const { common, only } = verdict;
  const nothingShared = common.tags.length === 0 && common.artists.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Common ground
        </h3>
        {nothingShared ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Nothing in common — no shared genres, no shared artists. You two are listening to
            completely different music.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {common.artists.length > 0 && (
              <p className="text-sm">
                <span className="text-[var(--color-muted)]">Both play </span>
                <span className="font-medium">{common.artists.join(", ")}</span>
              </p>
            )}
            {common.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {common.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[rgba(236,233,214,0.2)] px-2.5 py-0.5 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OnlyList color={SERIES.a} name={nameA} tags={only.a} />
        <OnlyList color={SERIES.b} name={nameB} tags={only.b} />
      </div>
    </div>
  );
}

function OnlyList({ color, name, tags }: { color: string; name: string; tags: string[] }) {
  return (
    <div>
      <h4 className="flex items-center gap-2 text-xs font-semibold text-[var(--color-cream)]">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate">Only {name}</span>
      </h4>
      {tags.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--color-muted)]">No genres of its own.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[rgba(236,233,214,0.16)] px-2.5 py-0.5 text-xs text-[var(--color-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
