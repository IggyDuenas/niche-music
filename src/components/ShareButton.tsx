"use client";

import { useEffect, useState } from "react";

/**
 * The whole comparison card travels inside the link, so there is nothing to
 * store and nothing to sign up for. `navigator.clipboard` needs a secure
 * context, so the URL is always shown as selectable text as well.
 */
export function ShareButton({ path, label }: { path: string; label: string }) {
  const [href, setHref] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHref(`${window.location.origin}${path}`);
  }, [path]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked; the visible URL below is the fallback.
      setCopied(false);
    }
  };

  return (
    <div className="panel p-5">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Send this link. They pick one of their own playlists and you both see who wins.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={href}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel-2)] px-3 py-2 text-xs text-[var(--color-muted)] outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
