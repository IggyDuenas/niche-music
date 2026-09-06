"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Histogram } from "@/components/Histogram";
import { Panel, Stat } from "@/components/Panel";
import { ScoreDial } from "@/components/ScoreDial";
import { ShareButton } from "@/components/ShareButton";
import { TrackList } from "@/components/TrackList";
import { encodeCard, type ShareCard } from "@/lib/share";
import { storedAppleToken } from "@/lib/musickit";
import type { AnalysisResult } from "@/lib/types";

type Payload = { result: AnalysisResult; warnings?: string[]; label: string; card: ShareCard };

const LOADING_STEPS = [
  "Reading the playlist…",
  "Matching tracks against listening data…",
  "Counting how many people share your taste…",
  "Almost there — scoring the long tail…",
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
      <Shell>
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
      <Shell>
        <Panel>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--color-terracotta)]" />
            <p className="text-sm text-[var(--color-muted)]">{LOADING_STEPS[step]}</p>
          </div>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Scoring “{playlistName}” — every track is a separate lookup, so this takes a moment.
          </p>
        </Panel>
      </Shell>
    );
  }

  const { result, warnings, label, card } = payload;

  return (
    <Shell>
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
        <Stat value={`${result.matchedTracks}`} label="tracks scored" hint={`of ${result.totalTracks} unique tracks`} />
        <Stat value={compact(result.medianTrackListeners)} label="median listeners" hint="for the typical song here" />
        <Stat value={`${result.deepCutShare}%`} label="deep cuts" hint="tracks almost nobody plays" />
        <Stat value={`${result.mainstreamShare}%`} label="certified hits" hint="tracks with a huge audience" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Spread of this playlist" hint="Each bar is a band of niche scores.">
          <Histogram data={result.distribution} />
        </Panel>

        <Panel title="Genres" hint="Counted once per artist, so one favourite can't skew it.">
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

        <Panel title="Deepest cuts" hint="The least-listened-to things in here.">
          <TrackList tracks={result.mostNiche} emptyNote="Nothing matched the reference data." />
        </Panel>

        <Panel title="Most mainstream picks" hint="No judgement.">
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
                {result.totalTracks - result.matchedTracks} tracks had no match in the reference
                data and were left out of the score.
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
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
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsInner />
    </Suspense>
  );
}
