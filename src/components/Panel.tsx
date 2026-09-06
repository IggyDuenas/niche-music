export function Panel({
  title,
  hint,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel p-5 ${className}`}>
      {title && (
        <header className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            {title}
          </h2>
          {hint && <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="panel p-4">
      <p className="nums text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-[var(--color-chalk)]">{label}</p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}
