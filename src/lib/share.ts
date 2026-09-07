import type { AnalysisResult, Provider } from "./types";

/**
 * A playlist result small enough to live in a URL. Sharing works with no
 * account and no database: the whole card travels in the link, so a friend can
 * open a comparison without either of you storing anything.
 */
export type ShareCard = {
  /** Playlist name. */
  n: string;
  /** Whose playlist it is. */
  o: string;
  /** Niche score. */
  s: number;
  /** Percentile. */
  p: number;
  /** Verdict label. */
  v: string;
  /** Tracks that were scored. */
  t: number;
  /** Deep-cut share, percent. */
  d: number;
  /** Median track listeners. */
  m: number | null;
  /** A few standout tracks: [title, artist, score]. */
  h: [string, string, number][];
  /** Provider the playlist came from. */
  g: Provider;
  /** Mainstream share, percent. */
  ms: number;
  /** The most obscure single track's score. */
  rf: number;
  /** Distinct artists as a share of tracks, percent. */
  ab: number;
  /** Distinct genre tags. */
  gc: number;
  /** Standard deviation of the per-track scores. */
  sp: number;
  /** Ten bucket counts across 0-100, for the distribution overlay. */
  db: number[];
  /** Top genre tags, most common first. */
  tg: string[];
  /** The most obscure artists, for finding common ground. */
  ar: string[];
};

/*
 * The whole card travels in the URL, so every list here is capped. Two cards
 * plus the origin has to stay inside what messaging apps will carry as one
 * link — `share.test.mjs` asserts the budget.
 */
const MAX_TAGS = 6;
const MAX_ARTISTS = 6;

const MAX_TEXT = 80;
const MAX_HIGHLIGHTS = 3;

function trim(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length === 0 ? fallback : cleaned.slice(0, MAX_TEXT);
}

function num(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
}

export function toShareCard(
  result: AnalysisResult,
  playlistName: string,
  owner: string,
): ShareCard {
  return {
    n: trim(playlistName, "A playlist"),
    o: trim(owner, "Someone"),
    s: result.nicheScore,
    p: result.percentile,
    v: trim(result.verdict.label, "Scored"),
    t: result.matchedTracks,
    d: result.deepCutShare,
    m: result.medianTrackListeners,
    h: result.mostNiche.slice(0, MAX_HIGHLIGHTS).map((track) => [
      trim(track.title, "Unknown"),
      trim(track.artist, "Unknown"),
      Math.round(track.nicheScore),
    ]),
    g: result.provider === "apple" ? "apple" : "spotify",
    ms: result.mainstreamShare,
    rf: result.rarestFind,
    ab: result.artistBreadth,
    gc: result.genreCount,
    sp: result.spread,
    db: result.distribution.map((bucket) => bucket.count),
    tg: result.topTags.slice(0, MAX_TAGS).map((tag) => trim(tag.tag, "unknown")),
    ar: result.deepestArtists.slice(0, MAX_ARTISTS).map((artist) => trim(artist.artist, "Unknown")),
  };
}

/* Base64url over UTF-8, working the same in the browser and in Node. */

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeCard(card: ShareCard): string {
  return toBase64Url(JSON.stringify(card));
}

/**
 * Decodes a card from a URL. Everything here arrived from an untrusted link, so
 * every field is re-validated and clamped rather than trusted — a hostile link
 * should produce a boring card, not a broken page.
 */
export function decodeCard(encoded: string | null | undefined): ShareCard | null {
  if (!encoded || encoded.length > 4000) return null;
  try {
    const raw = JSON.parse(fromBase64Url(encoded)) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return null;

    const highlights = Array.isArray(raw.h) ? raw.h.slice(0, MAX_HIGHLIGHTS) : [];
    const median = raw.m === null || raw.m === undefined ? null : num(raw.m, 0, 1e12, 0);

    return {
      n: trim(raw.n, "A playlist"),
      o: trim(raw.o, "Someone"),
      s: num(raw.s, 0, 100, 0),
      p: num(raw.p, 0, 100, 0),
      v: trim(raw.v, "Scored"),
      t: num(raw.t, 0, 100000, 0),
      d: num(raw.d, 0, 100, 0),
      m: median,
      h: highlights
        .filter((entry): entry is unknown[] => Array.isArray(entry))
        .map((entry) => [
          trim(entry[0], "Unknown"),
          trim(entry[1], "Unknown"),
          num(entry[2], 0, 100, 0),
        ] as [string, string, number]),
      g: raw.g === "apple" ? "apple" : "spotify",
      ms: num(raw.ms, 0, 100, 0),
      rf: num(raw.rf, 0, 100, 0),
      ab: num(raw.ab, 0, 100, 0),
      gc: num(raw.gc, 0, 10000, 0),
      sp: num(raw.sp, 0, 100, 0),
      db: readBuckets(raw.db),
      tg: (Array.isArray(raw.tg) ? raw.tg : []).slice(0, MAX_TAGS).map((t) => trim(t, "unknown")),
      ar: (Array.isArray(raw.ar) ? raw.ar : []).slice(0, MAX_ARTISTS).map((a) => trim(a, "Unknown")),
    };
  } catch {
    return null;
  }
}

/** Always exactly ten buckets, whatever a link claims to carry. */
function readBuckets(value: unknown): number[] {
  const raw = Array.isArray(value) ? value : [];
  return Array.from({ length: 10 }, (_, i) => num(raw[i], 0, 100000, 0));
}

/** Who wins, and by how much. Ties are real and worth naming. */
export function compare(a: ShareCard, b: ShareCard) {
  const gap = Math.round(Math.abs(a.s - b.s) * 10) / 10;
  if (gap < 1) return { winner: null as null | "a" | "b", gap, tied: true };
  return { winner: a.s > b.s ? ("a" as const) : ("b" as const), gap, tied: false };
}

/* ---------------------------------------------------------------- *
 * The head-to-head
 * ---------------------------------------------------------------- */

export type Round = {
  key: string;
  label: string;
  /** What the number means, and why more (or less) of it is better. */
  hint: string;
  a: number;
  b: number;
  winner: "a" | "b" | null;
  /** True where a smaller number wins the round. */
  lowerWins: boolean;
  /**
   * What a smaller number means on this row. "Rarer" is right for audience size
   * and hit count, but a low spread means steadier, not rarer — one generic
   * note across all three rows would say something untrue about this one.
   */
  lowerNote?: string;
  /** How to render the values. */
  unit: "score" | "percent" | "count" | "listeners";
};

/** Ties inside this margin are called as ties rather than as a win. */
const TIE_MARGIN: Record<Round["unit"], number> = {
  score: 1,
  percent: 1,
  count: 0,
  listeners: 0,
};

function judge(round: Omit<Round, "winner">): Round {
  const margin = TIE_MARGIN[round.unit];
  const difference = round.a - round.b;
  if (Math.abs(difference) <= margin) return { ...round, winner: null };
  const aWins = round.lowerWins ? difference < 0 : difference > 0;
  return { ...round, winner: aWins ? "a" : "b" };
}

/**
 * Seven ways of asking the same question, because one average hides a lot: a
 * playlist can score well on a single unheard-of song, or by being rare the
 * whole way through, and those are different kinds of taste.
 */
export function rounds(a: ShareCard, b: ShareCard): Round[] {
  return [
    judge({
      key: "overall",
      label: "How rare overall",
      hint: "The average score across every song we could look up.",
      a: a.s,
      b: b.s,
      lowerWins: false,
      unit: "score",
    }),
    judge({
      key: "deep",
      label: "Rare songs",
      hint: "How much of the playlist almost nobody else plays.",
      a: a.d,
      b: b.d,
      lowerWins: false,
      unit: "percent",
    }),
    judge({
      key: "rarest",
      label: "Rarest single song",
      hint: "The least-played song in the whole playlist.",
      a: a.rf,
      b: b.rf,
      lowerWins: false,
      unit: "score",
    }),
    judge({
      key: "audience",
      label: "Typical listener count",
      hint: "How many people play the middle-of-the-road song here.",
      a: a.m ?? 0,
      b: b.m ?? 0,
      lowerWins: true,
      unit: "listeners",
    }),
    judge({
      key: "hits",
      label: "Big hits",
      hint: "How much of the playlist is music millions of people play.",
      a: a.ms,
      b: b.ms,
      lowerWins: true,
      unit: "percent",
    }),
    judge({
      key: "variety",
      label: "Different artists",
      hint: "How many different artists there are. High means you are not repeating the same few.",
      a: a.ab,
      b: b.ab,
      lowerWins: false,
      unit: "percent",
    }),
    judge({
      key: "commitment",
      label: "How consistent",
      hint: "Whether the whole playlist is rare, or just a couple of songs pulling the average up.",
      a: a.sp,
      b: b.sp,
      lowerWins: true,
      lowerNote: "lower is steadier",
      unit: "score",
    }),
  ];
}

export type Verdict = {
  /** The headline winner, decided on overall score. */
  winner: "a" | "b" | null;
  gap: number;
  tied: boolean;
  rounds: Round[];
  roundsWon: { a: number; b: number; drawn: number };
  /** Genres and artists both playlists have. */
  common: { tags: string[]; artists: string[] };
  /** Genres only one side has. */
  only: { a: string[]; b: string[] };
};

function intersect(left: string[], right: string[]): string[] {
  const lookup = new Set(right.map((value) => value.toLowerCase()));
  return left.filter((value) => lookup.has(value.toLowerCase()));
}

function difference(left: string[], right: string[]): string[] {
  const lookup = new Set(right.map((value) => value.toLowerCase()));
  return left.filter((value) => !lookup.has(value.toLowerCase()));
}

export function verdict(a: ShareCard, b: ShareCard): Verdict {
  const outcome = compare(a, b);
  const list = rounds(a, b);

  return {
    winner: outcome.winner,
    gap: outcome.gap,
    tied: outcome.tied,
    rounds: list,
    roundsWon: {
      a: list.filter((round) => round.winner === "a").length,
      b: list.filter((round) => round.winner === "b").length,
      drawn: list.filter((round) => round.winner === null).length,
    },
    common: {
      tags: intersect(a.tg, b.tg),
      artists: intersect(a.ar, b.ar),
    },
    only: {
      a: difference(a.tg, b.tg),
      b: difference(b.tg, a.tg),
    },
  };
}

/**
 * Bucket counts as a share of each playlist, so the distribution overlay
 * compares shape rather than size — otherwise the longer playlist always
 * draws the bigger curve.
 */
export function distributionShares(card: ShareCard): number[] {
  const total = card.db.reduce((sum, count) => sum + count, 0);
  if (total === 0) return new Array(10).fill(0);
  return card.db.map((count) => (count / total) * 100);
}
