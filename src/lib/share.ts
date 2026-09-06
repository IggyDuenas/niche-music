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
};

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
    };
  } catch {
    return null;
  }
}

/** Who wins, and by how much. Ties are real and worth naming. */
export function compare(a: ShareCard, b: ShareCard) {
  const gap = Math.round(Math.abs(a.s - b.s) * 10) / 10;
  if (gap < 1) return { winner: null as null | "a" | "b", gap, tied: true };
  return { winner: a.s > b.s ? ("a" as const) : ("b" as const), gap, tied: false };
}
