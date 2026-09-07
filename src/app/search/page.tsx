"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ground } from "@/components/Ground";
import { Panel } from "@/components/Panel";
import { authorizeApple, storedAppleToken } from "@/lib/musickit";
import { DEFAULT_COLORWAY } from "@/lib/colorways";
import type { ScoredTrack } from "@/lib/types";

const DEBOUNCE_MS = 450;

function compact(value: number | undefined): string {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function verdictFor(score: number): string {
  if (score >= 80) return "Almost nobody plays this";
  if (score >= 65) return "Hardly anyone plays this";
  if (score >= 45) return "Some people know this";
  if (score >= 25) return "Plenty of people play this";
  return "Everybody knows this one";
}

function SearchInner() {
  const [term, setTerm] = useState("");
  const [tracks, setTracks] = useState<ScoredTrack[] | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "searching" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  // Lets a slow response from an earlier keystroke be discarded.
  const latestRequest = useRef(0);

  useEffect(() => {
    setConnected(Boolean(storedAppleToken()));
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      await authorizeApple();
      setConnected(true);
      setStatus("idle");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Could not connect to Apple Music.");
    }
  }, []);

  const search = useCallback(async (query: string) => {
    const userToken = storedAppleToken();
    if (!userToken) {
      setConnected(false);
      return;
    }

    const requestId = ++latestRequest.current;
    setStatus("searching");
    setError(null);
    try {
      const response = await fetch("/api/apple/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken, term: query }),
      });
      const body = await response.json();
      // A newer keystroke has already fired; this answer is stale.
      if (requestId !== latestRequest.current) return;
      if (!response.ok) throw new Error(body.error ?? "Search failed.");
      setTracks(body.tracks ?? []);
      setStatus("idle");
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Search failed.");
    }
  }, []);

  useEffect(() => {
    if (!connected) return;
    const query = term.trim();
    if (query.length < 2) {
      setTracks(null);
      return;
    }
    // Scoring a page of results is a lot of lookups, so wait for a pause.
    const timer = setTimeout(() => void search(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term, connected, search]);

  return (
    <Ground colorway={DEFAULT_COLORWAY} cycle>
      <main className="mx-auto max-w-2xl px-5 py-12">
        <Link href="/" className="text-xs text-[var(--color-muted)] underline underline-offset-2">
          ← Niche Music
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Score any song</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Search Apple Music and see how many people actually play a song. You don&apos;t need to own
          it.
        </p>

        {!connected ? (
          <Panel className="mt-8">
            <p className="text-sm text-[var(--color-muted)]">
              Searching uses your Apple Music connection.
            </p>
            <button
              type="button"
              onClick={connect}
              disabled={status === "connecting"}
              className="mt-4 rounded-full bg-[var(--color-cream)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:brightness-105 disabled:opacity-50"
            >
              {status === "connecting" ? "Connecting…" : "Connect Apple Music"}
            </button>
            {error && <p className="mt-3 text-xs text-[var(--color-gold)]">{error}</p>}
          </Panel>
        ) : (
          <>
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search a song or artist"
              autoFocus
              className="panel mt-7 w-full px-5 py-3.5 text-base outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
            />

            {status === "searching" && (
              <p className="mt-4 flex items-center gap-2.5 text-sm text-[var(--color-muted)]">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--color-accent)]" />
                Scoring results…
              </p>
            )}

            {error && <p className="mt-4 text-sm text-[var(--color-gold)]">{error}</p>}

            {tracks !== null && tracks.length === 0 && status !== "searching" && (
              <p className="mt-6 text-sm text-[var(--color-muted)]">
                Nothing found for “{term.trim()}”.
              </p>
            )}

            {tracks && tracks.length > 0 && (
              <ul className="mt-6 space-y-2">
                {tracks.map((track, index) => (
                  <li key={`${track.id}-${index}`}>
                    <Result track={track} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </Ground>
  );
}

function Result({ track }: { track: ScoredTrack }) {
  return (
    <div className="panel flex items-center gap-3 px-4 py-3">
      {track.artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={track.artworkUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded bg-[rgba(236,233,214,0.06)]" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{track.title}</p>
        <p className="truncate text-xs text-[var(--color-muted)]">{track.artist}</p>
        {track.scored && (
          <p className="mt-0.5 truncate text-[11px] text-[var(--color-accent)]">
            {verdictFor(track.nicheScore)}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        {track.scored ? (
          <>
            <p className="nums text-lg font-bold">{Math.round(track.nicheScore)}</p>
            <p className="text-[11px] text-[var(--color-muted)]">
              {compact(track.stats.trackListeners)} listeners
            </p>
          </>
        ) : (
          <p className="text-[11px] text-[var(--color-muted)]">Couldn&apos;t find it</p>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}
