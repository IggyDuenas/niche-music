import { SERIES } from "./series";

/**
 * Both playlists' score distributions on one axis.
 *
 * Values are percentages of each playlist rather than raw song counts: the two
 * playlists are different lengths, and plotting counts would just show which
 * one is longer. Same unit on both series, so one axis is correct here.
 */
export function DistributionOverlay({
  a,
  b,
  nameA,
  nameB,
}: {
  a: number[];
  b: number[];
  nameA: string;
  nameB: string;
}) {
  const ceiling = Math.max(...a, ...b, 1);

  return (
    <div>
      <div className="flex h-44 items-end gap-1.5" role="img"
           aria-label={`How the songs in ${nameA} and ${nameB} are spread from popular to rare`}>
        {a.map((shareA, index) => {
          const shareB = b[index] ?? 0;
          const band = `${index * 10}-${index * 10 + 10}`;
          return (
            <div key={index} className="flex h-full flex-1 items-end justify-center gap-[3px]">
              <Column
                share={shareA}
                ceiling={ceiling}
                color={SERIES.a}
                title={`${nameA}: ${shareA.toFixed(0)}% of songs score ${band}`}
              />
              <Column
                share={shareB}
                ceiling={ceiling}
                color={SERIES.b}
                title={`${nameB}: ${shareB.toFixed(0)}% of songs score ${band}`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-[var(--color-muted)]">
        <span>← popular songs</span>
        <span>% of each playlist</span>
        <span>rare songs →</span>
      </div>
    </div>
  );
}

function Column({
  share,
  ceiling,
  color,
  title,
}: {
  share: number;
  ceiling: number;
  color: string;
  title: string;
}) {
  return (
    <div
      className="w-full rounded-t-[3px]"
      style={{
        height: `${Math.max(1.5, (share / ceiling) * 100)}%`,
        backgroundColor: color,
      }}
      title={title}
    />
  );
}
