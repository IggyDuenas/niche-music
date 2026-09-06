import type {
  AnalysisResult,
  LibraryTrack,
  Provider,
  ReferenceStats,
  ScoredTrack,
  TagCount,
} from "./types";

/**
 * Listener counts are extremely long-tailed — a global hit has ~1000x the
 * listeners of a well-known indie act, which in turn has ~1000x a bedroom
 * producer. Scoring on raw counts would put almost everything at one end, so
 * every count is compared on a log10 scale.
 *
 * The bounds below are the log10 listener counts we treat as "as obscure as it
 * gets" (lo) and "globally ubiquitous" (hi). Anything outside is clamped.
 */
const TRACK_BOUNDS = { lo: 1.5, hi: 6.3 }; // ~32 listeners .. ~2M listeners
const ARTIST_BOUNDS = { lo: 2.0, hi: 6.8 }; // ~100 listeners .. ~6.3M listeners

/** How much the specific recording counts vs. the artist's overall reach. */
const TRACK_WEIGHT = 0.55;
const ARTIST_WEIGHT = 0.45;

/** A track scoring above this is a "deep cut"; below MAINSTREAM_AT it's a hit. */
export const DEEP_CUT_AT = 70;
export const MAINSTREAM_AT = 30;

/**
 * Maps a listener count onto 0-100, where 100 means almost nobody listens.
 * Returns null when we have no data rather than guessing a middle value.
 */
export function obscurityFromListeners(
  listeners: number | undefined,
  bounds: { lo: number; hi: number },
): number | null {
  if (listeners === undefined || !Number.isFinite(listeners) || listeners < 0) return null;
  const scale = Math.log10(listeners + 1);
  const position = (scale - bounds.lo) / (bounds.hi - bounds.lo);
  return round(100 * (1 - clamp(position, 0, 1)));
}

/** Combines the track-level and artist-level signals into one 0-100 score. */
export function scoreTrack(track: LibraryTrack, stats: ReferenceStats): ScoredTrack {
  const trackObscurity = obscurityFromListeners(stats.trackListeners, TRACK_BOUNDS);
  const artistObscurity = obscurityFromListeners(stats.artistListeners, ARTIST_BOUNDS);

  let nicheScore = 0;
  let scored = true;

  if (trackObscurity !== null && artistObscurity !== null) {
    nicheScore = TRACK_WEIGHT * trackObscurity + ARTIST_WEIGHT * artistObscurity;
  } else if (trackObscurity !== null) {
    nicheScore = trackObscurity;
  } else if (artistObscurity !== null) {
    nicheScore = artistObscurity;
  } else {
    scored = false;
  }

  return {
    ...track,
    stats,
    nicheScore: round(nicheScore),
    breakdown: { trackObscurity, artistObscurity },
    scored,
  };
}

/**
 * Calibration curve turning a library's mean niche score into a percentile.
 *
 * These anchors are a stated assumption, not a measurement: they encode that a
 * chart-driven listener lands in the low 20s and that scores above 70 are rare
 * because a library that obscure has almost no reference data behind it. Swap
 * these for real percentiles once you have enough submitted libraries to
 * compute them — see README, "Calibrating the percentile".
 */
const BASELINE_CURVE: [score: number, percentile: number][] = [
  [0, 0],
  [12, 3],
  [20, 12],
  [28, 30],
  [36, 50],
  [44, 68],
  [52, 82],
  [60, 91],
  [70, 97],
  [80, 99.4],
  [100, 100],
];

export function percentileForScore(score: number): number {
  const s = clamp(score, 0, 100);
  for (let i = 1; i < BASELINE_CURVE.length; i++) {
    const [prevScore, prevPct] = BASELINE_CURVE[i - 1];
    const [nextScore, nextPct] = BASELINE_CURVE[i];
    if (s <= nextScore) {
      const t = (s - prevScore) / (nextScore - prevScore);
      return round(prevPct + t * (nextPct - prevPct));
    }
  }
  return 100;
}

const VERDICTS: { min: number; label: string; blurb: string }[] = [
  { min: 72, label: "Off the map", blurb: "Most of your library has fewer listeners than a mid-sized group chat. Either you dig very deep or half of this is unreleased." },
  { min: 60, label: "Genuinely obscure", blurb: "You live in the long tail. The average person has not heard of the average artist here." },
  { min: 48, label: "Crate digger", blurb: "Plenty of small artists, a few names people would recognise. You find things before they get big." },
  { min: 36, label: "Off the beaten path", blurb: "You've wandered off the algorithm's main road but you still come back for the hits." },
  { min: 24, label: "Comfortably curious", blurb: "A solid mainstream base with real excursions. This is what most people who think they're niche actually score." },
  { min: 12, label: "Chart-adjacent", blurb: "You mostly listen to what a lot of other people are also listening to, with the odd detour." },
  { min: 0, label: "Certified popular", blurb: "This is the radio. Nothing wrong with the radio — millions of people agree with you." },
];

export function verdictForScore(score: number): { label: string; blurb: string } {
  const hit = VERDICTS.find((v) => score >= v.min) ?? VERDICTS[VERDICTS.length - 1];
  return { label: hit.label, blurb: hit.blurb };
}

/** Ten equal buckets across 0-100, for the histogram. */
export function distribution(scores: number[]): { bucket: string; count: number }[] {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}-${i * 10 + 10}`,
    count: 0,
  }));
  for (const score of scores) {
    const index = Math.min(9, Math.floor(clamp(score, 0, 100) / 10));
    buckets[index].count++;
  }
  return buckets;
}

/** Population standard deviation. Zero for fewer than two values. */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return round(Math.sqrt(variance));
}

export function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

/**
 * Tags describe an artist's whole catalogue, so counting one per track would
 * let a single heavily-represented artist dominate. We count each tag once per
 * distinct artist instead.
 */
function collectTags(tracks: ScoredTrack[]): TagCount[] {
  const seen = new Map<string, Set<string>>();
  for (const track of tracks) {
    for (const tag of track.stats.tags.slice(0, 5)) {
      const key = tag.toLowerCase();
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key)!.add(track.artist.toLowerCase());
    }
  }
  const artistCount = new Set(tracks.map((t) => t.artist.toLowerCase())).size || 1;
  return [...seen.entries()]
    .map(([tag, artists]) => ({
      tag,
      count: artists.size,
      share: round((artists.size / artistCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 18);
}

function distinctGenres(tracks: ScoredTrack[]): number {
  const tags = new Set<string>();
  for (const track of tracks) {
    for (const tag of track.stats.tags.slice(0, 5)) tags.add(tag.toLowerCase());
  }
  return tags.size;
}

function collectArtists(tracks: ScoredTrack[]) {
  const byArtist = new Map<string, { artist: string; listeners: number | null; trackCount: number }>();
  for (const track of tracks) {
    const key = track.artist.toLowerCase();
    const existing = byArtist.get(key);
    if (existing) {
      existing.trackCount++;
      continue;
    }
    byArtist.set(key, {
      artist: track.artist,
      listeners: track.stats.artistListeners ?? null,
      trackCount: 1,
    });
  }
  return [...byArtist.values()]
    .filter((a) => a.listeners !== null)
    .sort((a, b) => (a.listeners ?? 0) - (b.listeners ?? 0))
    .slice(0, 12);
}

export function analyze(
  scoredTracks: ScoredTrack[],
  provider: Provider | "combined",
): AnalysisResult {
  const matched = scoredTracks.filter((t) => t.scored);
  const scores = matched.map((t) => t.nicheScore);
  const nicheScore = scores.length ? round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const bySource = new Map<Provider, { provider: Provider; trackCount: number; origins: Set<string> }>();
  for (const track of scoredTracks) {
    const entry = bySource.get(track.source) ?? {
      provider: track.source,
      trackCount: 0,
      origins: new Set<string>(),
    };
    entry.trackCount++;
    entry.origins.add(track.origin);
    bySource.set(track.source, entry);
  }

  const ranked = [...matched].sort((a, b) => b.nicheScore - a.nicheScore);
  const distinctArtists = new Set(matched.map((t) => t.artist.toLowerCase())).size;

  return {
    provider,
    generatedAt: new Date().toISOString(),
    totalTracks: scoredTracks.length,
    matchedTracks: matched.length,
    nicheScore,
    percentile: percentileForScore(nicheScore),
    verdict: verdictForScore(nicheScore),
    distribution: distribution(scores),
    medianTrackListeners: median(
      matched.map((t) => t.stats.trackListeners).filter((v): v is number => v !== undefined),
    ),
    medianArtistListeners: median(
      matched.map((t) => t.stats.artistListeners).filter((v): v is number => v !== undefined),
    ),
    deepCutShare: matched.length
      ? round((matched.filter((t) => t.nicheScore >= DEEP_CUT_AT).length / matched.length) * 100)
      : 0,
    mainstreamShare: matched.length
      ? round((matched.filter((t) => t.nicheScore < MAINSTREAM_AT).length / matched.length) * 100)
      : 0,
    rarestFind: ranked.length ? ranked[0].nicheScore : 0,
    artistCount: distinctArtists,
    artistBreadth: matched.length ? round((distinctArtists / matched.length) * 100) : 0,
    genreCount: distinctGenres(matched),
    spread: standardDeviation(scores),
    topTags: collectTags(matched),
    mostNiche: ranked.slice(0, 15),
    mostMainstream: ranked.slice(-15).reverse(),
    deepestArtists: collectArtists(matched),
    sources: [...bySource.values()].map((s) => ({
      provider: s.provider,
      trackCount: s.trackCount,
      origins: [...s.origins],
    })),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
