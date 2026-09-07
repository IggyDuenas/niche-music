"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Histogram } from "@/components/Histogram";
import { Panel, Stat } from "@/components/Panel";
import { ScoreDial } from "@/components/ScoreDial";
import { ShareButton } from "@/components/ShareButton";
import { TrackList } from "@/components/TrackList";
import { Ground } from "@/components/Ground";
import { colorwayFor } from "@/lib/colorways";
import { encodeCard, type ShareCard } from "@/lib/share";
import { storedAppleToken } from "@/lib/musickit";
import type { AnalysisResult } from "@/lib/types";

type Payload = { result: AnalysisResult; warnings?: string[]; label: string; card: ShareCard };

const LOADING_STEPS = [
  "Reading the playlist…",
  "Looking up how many people play each song…",
  "Counting how many people share your taste…",
  "Almost there — scoring the rarest ones…",
];

function compact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function ResultsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const source = params.get("source") === "apple" ? "apple" : "spotify";
  const playlistId = params.get("playlist") ?? "";
  const playlistName = params.get("name") ?? "Playlist";
  const challenge = params.get("vs");

  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  // Guards against the double-invoked effect in React strict mode.
  const started = useRef(false);

  const run = useCallback(async () => {
    try {
      const body: Record<string, unknown> = { playlistId, playlistName, maxTracks: 500 };
      if (source === "apple") {
        const userToken = storedAppleToken();
        if (!userToken) throw new Error("Apple Music sign-in expired. Connect again to continue.");
        body.userToken = userToken;
      }

      const response = await fetch(`/api/analyze/${source}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const parsed = await response.json();
      if (!response.ok) throw new Error(parsed.error ?? "Analysis failed.");

      // Answering a challenge goes straight to the head-to-head.
      if (challenge) {
        router.replace(`/vs?a=${encodeURIComponent(challenge)}&b=${encodeURIComponent(encodeCard(parsed.card))}`);
        return;
      }
      setPayload(parsed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    }
  }, [challenge, playlistId, playlistName, router, source]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  useEffect(() => {
    if (payload || error) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 3500);
    return () => clearInterval(timer);
  }, [payload, error]);

  if (error) {
    return (
      <Shell seed={playlistName}>
        <Panel>
          <p className="text-sm text-[var(--color-gold)]">{error}</p>
          <Link href="/" className="mt-4 inline-block text-sm underline">
            Back to the start
          </Link>
        </Panel>
      </Shell>
    );
  }

  if (!payload) {
    return (
      <Shell seed={playlistName}>
        <Panel>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--color-accent)]" />
            <p className="text-sm text-[var(--color-muted)]">{LOADING_STEPS[step]}</p>
          </div>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Scoring “{playlistName}” — every song is looked up one by one, so this takes a moment.
          </p>
        </Panel>
      </Shell>
    );
  }

  const { result, warnings, label, card } = payload;

  return (
    <Shell seed={playlistName}>
      <Panel className="!p-8">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          {label}
        </p>
        <ScoreDial score={result.nicheScore} percentile={result.percentile} label={result.verdict.label} />
        <p className="mx-auto mt-5 max-w-md text-center text-sm leading-relaxed text-[var(--color-muted)]">
          {result.verdict.blurb}
        </p>
      </Panel>

      <div className="mt-4">
        <ShareButton path={`/vs?a=${encodeURIComponent(encodeCard(card))}`} label="Challenge a friend" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat value={`${result.matchedTracks}`} label="songs checked" hint={`of ${result.totalTracks} different songs`} />
        <Stat value={compact(result.medianTrackListeners)} label="typical listeners" hint="for a middle-of-the-road song here" />
        <Stat value={`${result.deepCutShare}%`} label="rare songs" hint="almost nobody else plays these" />
        <Stat value={`${result.mainstreamShare}%`} label="big hits" hint="millions of people play these" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="How your songs break down" hint="Taller bars mean more of your songs scored in that range.">
          <Histogram data={result.distribution} />
        </Panel>

        <Panel title="Genres" hint="Counted once per artist, so one favourite band can't take over.">
          {result.topTags.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No genre tags available from this data source.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {result.topTags.map((tag) => (
                <span
                  key={tag.tag}
                  className="rounded-full border border-[rgba(236,233,214,0.14)] px-3 py-1 text-xs"
                  style={{ opacity: 0.55 + Math.min(0.45, tag.share / 100) }}
                >
                  {tag.tag}
                  <span className="nums ml-1.5 text-[var(--color-muted)]">{tag.count}</span>
                </span>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Your rarest songs" hint="The least-played songs in this playlist.">
          <TrackList tracks={result.mostNiche} emptyNote="Nothing matched the reference data." />
        </Panel>

        <Panel title="Your most popular songs" hint="No judgement.">
          <TrackList tracks={result.mostMainstream} emptyNote="Nothing matched the reference data." />
        </Panel>

        <Panel title="Artists nobody else has heard of" className="lg:col-span-2">
          {result.deepestArtists.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No artist data available.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {result.deepestArtists.map((artist) => (
                <li
                  key={artist.artist}
                  className="flex items-baseline justify-between gap-3 rounded-lg bg-[rgba(236,233,214,0.06)] px-3 py-2"
                >
                  <span className="truncate text-sm">{artist.artist}</span>
                  <span className="nums shrink-0 text-xs text-[var(--color-muted)]">
                    {compact(artist.listeners)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {(result.totalTracks > result.matchedTracks || warnings?.length) && (
        <Panel title="Notes" className="mt-4">
          <ul className="space-y-1 text-sm text-[var(--color-muted)]">
            {result.totalTracks > result.matchedTracks && (
              <li>
                {result.totalTracks - result.matchedTracks} songs could not be found in the listening
                data, so they were left out of the score.
              </li>
            )}
            {warnings?.map((warning) => (
              <li key={warning} className="text-[var(--color-gold)]">{warning}</li>
            ))}
          </ul>
        </Panel>
      )}
    </Shell>
  );
}

function Shell({ children, seed }: { children: React.ReactNode; seed: string }) {
  return (
    // A playlist keeps one colourway wherever it is shown, here and on a
    // friend's comparison page.
    <Ground colorway={colorwayFor(seed)}>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/playlists?source=spotify" className="text-xs text-[var(--color-muted)] underline underline-offset-2">
            ← Another playlist
          </Link>
          <Link href="/" className="text-xs text-[var(--color-muted)] underline underline-offset-2">
            Start over
          </Link>
        </div>
        {children}
      </main>
    </Ground>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsInner />
    </Suspense>
  );
}
