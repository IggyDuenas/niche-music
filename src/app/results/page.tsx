"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Histogram } from "@/components/Histogram";
import { Panel, Stat } from "@/components/Panel";
import { ScoreDial } from "@/components/ScoreDial";
import { TrackList } from "@/components/TrackList";
import type { AnalysisResult } from "@/lib/types";

type Payload = { result: AnalysisResult; warnings?: string[] };

const LOADING_STEPS = [
  "Reading your library…",
  "Matching tracks against listening data…",
  "Working out how many people share your taste…",
  "Almost there — scoring the long tail…",
];

function compact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function ResultsInner() {
  const params = useSearchParams();
  const source = params.get("source") ?? "spotify";

  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  // Guards against the double-invoked effect in React strict mode.
  const started = useRef(false);

  const runSpotify = useCallback(async () => {
    try {
      const response = await fetch("/api/analyze/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxTracks: 400 }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Analysis failed.");
      setPayload(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Apple Music runs in the browser, so its result is handed over via storage.
    const stored = sessionStorage.getItem("nm:result");
    if (stored) {
      sessionStorage.removeItem("nm:result");
      try {
        setPayload(JSON.parse(stored) as Payload);
        return;
      } catch {
        // Fall through to a fresh analysis.
      }
    }

    if (source === "apple") {
      setError("That Apple Music result expired. Connect again from the home page.");
      return;
    }
    void runSpotify();
  }, [runSpotify, source]);

  useEffect(() => {
    if (payload || error) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 3500);
    return () => clearInterval(timer);
  }, [payload, error]);

  if (error) {
    return (
      <Shell>
        <Panel>
          <p className="text-sm text-[var(--color-hot)]">{error}</p>
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
            <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--color-accent)]" />
            <p className="text-sm text-[var(--color-muted)]">{LOADING_STEPS[step]}</p>
          </div>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            A few hundred tracks takes about half a minute — each one is a separate lookup.
          </p>
        </Panel>
      </Shell>
    );
  }

  const { result, warnings } = payload;

  return (
    <Shell>
      <Panel className="!p-8">
        <ScoreDial score={result.nicheScore} percentile={result.percentile} label={result.verdict.label} />
        <p className="mx-auto mt-5 max-w-md text-center text-sm leading-relaxed text-[var(--color-muted)]">
          {result.verdict.blurb}
        </p>
      </Panel>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          value={`${result.matchedTracks}`}
          label="tracks scored"
          hint={`of ${result.totalTracks} unique tracks read`}
        />
        <Stat
          value={compact(result.medianTrackListeners)}
          label="median listeners"
          hint="for the typical song in your library"
        />
        <Stat
          value={`${result.deepCutShare}%`}
          label="deep cuts"
          hint="tracks almost nobody else plays"
        />
        <Stat
          value={`${result.mainstreamShare}%`}
          label="certified hits"
          hint="tracks with a very large audience"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Spread of your library" hint="Each bar is a band of niche scores.">
          <Histogram data={result.distribution} />
        </Panel>

        <Panel title="Your genres" hint="Counted once per artist, so one favourite can't skew it.">
          {result.topTags.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No genre tags available from this data source.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {result.topTags.map((tag) => (
                <span
                  key={tag.tag}
                  className="rounded-full border border-[var(--color-edge)] px-3 py-1 text-xs"
                  style={{ opacity: 0.55 + Math.min(0.45, tag.share / 100) }}
                >
                  {tag.tag}
                  <span className="nums ml-1.5 text-[var(--color-muted)]">{tag.count}</span>
                </span>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Deepest cuts" hint="The least-listened-to things you own.">
          <TrackList tracks={result.mostNiche} emptyNote="Nothing matched the reference data." />
        </Panel>

        <Panel title="Your most mainstream picks" hint="No judgement.">
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
                  className="flex items-baseline justify-between gap-3 rounded-lg bg-[var(--color-panel-2)] px-3 py-2"
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

      <Panel title="Where this came from" className="mt-4">
        <ul className="space-y-1 text-sm text-[var(--color-muted)]">
          {result.sources.map((source) => (
            <li key={source.provider}>
              <span className="capitalize text-[var(--color-chalk)]">{source.provider}</span>{" "}
              — {source.trackCount} tracks from {source.origins.length} source
              {source.origins.length === 1 ? "" : "s"}
            </li>
          ))}
          {result.totalTracks > result.matchedTracks && (
            <li>
              {result.totalTracks - result.matchedTracks} tracks had no match in the reference data
              and were left out of the score.
            </li>
          )}
          {warnings?.map((warning) => (
            <li key={warning} className="text-[var(--color-hot)]">{warning}</li>
          ))}
        </ul>
      </Panel>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Niche Music
        </Link>
        <Link href="/" className="text-xs text-[var(--color-muted)] underline">
          Start over
        </Link>
      </div>
      {children}
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsInner />
    </Suspense>
  );
}
