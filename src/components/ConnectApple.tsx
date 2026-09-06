"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { authorizeApple } from "@/lib/musickit";

export function ConnectApple({ enabled, challenge }: { enabled: boolean; challenge?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  const connect = useCallback(async () => {
    setState("working");
    setMessage("Opening Apple Music sign-in…");
    try {
      await authorizeApple();
      const query = new URLSearchParams({ source: "apple" });
      if (challenge) query.set("vs", challenge);
      router.push(`/playlists?${query}`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }, [challenge, router]);

  return (
    <div>
      <button
        type="button"
        onClick={connect}
        disabled={!enabled || state === "working"}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-[var(--color-cream)]/25 px-7 py-4 text-[15px] font-semibold transition enabled:hover:border-[var(--color-cream)]/60 enabled:hover:bg-[var(--color-cream)]/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <AppleMark />
        {state === "working" ? "Connecting…" : "Connect Apple Music"}
      </button>
      {message && (
        <p className="mt-2 text-center text-xs text-[var(--color-muted)]">{message}</p>
      )}
      {!enabled && (
        <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
          Apple Music needs APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY.
        </p>
      )}
    </div>
  );
}

function AppleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.68c.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.18-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.21 1.1-.05 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.67-2.14.84-1.23 1.18-2.42 1.2-2.48-.03-.01-2.3-.88-2.32-3.5zM14.2 6.2c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.69-.92 2.69.97.07 1.96-.49 2.58-1.22z" />
    </svg>
  );
}
