type Props = { data: { bucket: string; count: number }[] };

/** Distribution of per-track scores — shows whether a library is split or even. */
export function Histogram({ data }: Props) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div>
      <div className="flex h-40 items-end gap-1.5">
        {data.map((bin) => (
          <div key={bin.bucket} className="group flex flex-1 flex-col items-center justify-end gap-1">
            <span className="nums text-[10px] text-[var(--color-muted)] opacity-0 transition group-hover:opacity-100">
              {bin.count}
            </span>
            <div
              className="w-full rounded-t bg-gradient-to-t from-[var(--color-terracotta-dim)] to-[var(--color-terracotta)] transition-all"
              style={{ height: `${Math.max(2, (bin.count / max) * 100)}%` }}
              title={`${bin.count} tracks scored ${bin.bucket}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[var(--color-muted)]">
        <span>← chart hits</span>
        <span>deep cuts →</span>
      </div>
    </div>
  );
}
