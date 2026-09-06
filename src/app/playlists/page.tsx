"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ground } from "@/components/Ground";
import { MiniSleeve } from "@/components/FigureGrid";
import { colorwayFor, DEFAULT_COLORWAY } from "@/lib/colorways";
import { authorizeApple, storedAppleToken } from "@/lib/musickit";
import type { PlaylistSummary } from "@/lib/types";

/** Entries that are not real playlists but are worth offering in the picker. */
function pseudoPlaylists(source: string): PlaylistSummary[] {
  if (source === "apple") {
    return [{ id: "", name: "Everything in my library", trackCount: null, provider: "apple" }];
  }
  return [
    { id: "liked", name: "Liked songs", trackCount: null, provider: "spotify" },
    { id: "", name: "Everything (liked + top + playlists)", trackCount: null, provider: "spotify" },
  ];
}

function PlaylistsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const source = params.get("source") === "apple" ? "apple" : "spotify";
  // Carried through so a friend's challenge survives the playlist choice.
  const challenge = params.get("vs");

  const [playlists, setPlaylists] = useState<PlaylistSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    try {
      if (source === "spotify") {
        const response = await fetch("/api/spotify/playlists");
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load your playlists.");
        setPlaylists(body.playlists ?? []);
        return;
      }

      const userToken = storedAppleToken() ?? (await authorizeApple());
      const response = await fetch("/api/apple/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load your playlists.");
      setPlaylists(body.playlists ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your playlists.");
    }
  }, [source]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const all = [...pseudoPlaylists(source), ...(playlists ?? [])];
    const needle = filter.trim().toLowerCase();
    return needle ? all.filter((p) => p.name.toLowerCase().includes(needle)) : all;
  }, [playlists, filter, source]);

  const choose = (playlist: PlaylistSummary) => {
    const query = new URLSearchParams({ source, playlist: playlist.id, name: playlist.name });
    if (challenge) query.set("vs", challenge);
    router.push(`/results?${query}`);
  };

  return (
    <Ground colorway={DEFAULT_COLORWAY} cycle>
      <main className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/" className="text-xs text-[var(--color-muted)] underline underline-offset-2">
          ← Start over
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          {challenge ? "Pick a playlist to answer with" : "Which playlist?"}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {challenge
            ? "Choose the one you want to put up against theirs."
            : "Score one playlist at a time — that is what makes a fair head-to-head."}
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-4 py-3">
            <p className="text-sm text-[var(--color-gold)]">{error}</p>
            <Link href="/" className="mt-2 inline-block text-xs underline">
              Back to the start
            </Link>
          </div>
        )}

        {!error && playlists === null && (
          <p className="mt-8 flex items-center gap-3 text-sm text-[var(--color-muted)]">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--color-accent)]" />
            Loading your playlists…
          </p>
        )}

        {playlists !== null && (
          <>
            {playlists.length > 8 && (
              <input
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Search your playlists"
                className="panel mt-6 w-full px-4 py-2.5 text-sm outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
              />
            )}

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {visible.map((playlist) => (
                <li key={`${playlist.provider}-${playlist.id}-${playlist.name}`}>
                  <button
                    type="button"
                    onClick={() => choose(playlist)}
                    className="panel flex w-full items-center gap-3 px-4 py-3 text-left transition hover:border-[var(--color-accent)] hover:bg-[rgba(236,233,214,0.06)]"
                  >
                    {playlist.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={playlist.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded object-cover" />
                    ) : (
                      // No cover of its own, so it gets the sleeve it will be pressed in.
                      <MiniSleeve
                        art={colorwayFor(playlist.name).art}
                        ink={colorwayFor(playlist.name).artInk}
                        size={3}
                        className="h-11 w-11 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{playlist.name}</p>
                      <p className="nums text-xs text-[var(--color-muted)]">
                        {playlist.trackCount === null ? "Tap to score" : `${playlist.trackCount} tracks`}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {visible.length === 0 && (
              <p className="mt-8 text-sm text-[var(--color-muted)]">
                No playlists matched “{filter}”.
              </p>
            )}
          </>
        )}
      </main>
    </Ground>
  );
}

export default function PlaylistsPage() {
  return (
    <Suspense fallback={null}>
      <PlaylistsInner />
    </Suspense>
  );
}
