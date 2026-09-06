import type { ReferenceStats } from "../types";
import { normalizeArtist, normalizeTitle } from "./normalize";

/**
 * Fallback corpus, used when no Last.fm key is configured. Deezer's public API
 * needs no credentials at all, which makes the app work out of the box, but it
 * reports a `rank` rather than a listener count, so the numbers below are
 * approximations calibrated to sit on the same log scale as Last.fm listeners.
 * Prefer Last.fm when you can — the scores are more meaningful.
 */

const BASE = "https://api.deezer.com";

type DeezerSearch = {
  data?: { id: number; title: string; rank?: number; artist?: { id: number; name: string } }[];
};

type DeezerArtist = { id: number; name: string; nb_fan?: number };

/**
 * Deezer's rank runs 0-1,000,000 and is heavily skewed: most of the catalogue
 * sits mid-range while genuine hits cluster near the top. The exponent bends
 * mid-ranks downward so they land where their real audience does.
 */
function rankToPseudoListeners(rank: number): number {
  const normalized = Math.min(1, Math.max(0, rank / 1_000_000));
  return Math.round(10 ** (1.5 + normalized ** 1.6 * 4.8));
}

/** Deezer fan counts run roughly an order of magnitude below Last.fm listeners. */
const FAN_TO_LISTENER_RATIO = 6;

async function get<T>(path: string): Promise<T | null> {
  const response = await fetch(`${BASE}${path}`, { next: { revalidate: 60 * 60 * 24 } });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function deezerTrack(
  artist: string,
  title: string,
): Promise<{ trackListeners?: number; artistId?: number } | null> {
  const query = `artist:"${normalizeArtist(artist)}" track:"${normalizeTitle(title)}"`;
  const data = await get<DeezerSearch>(`/search?limit=1&q=${encodeURIComponent(query)}`);
  const hit = data?.data?.[0];
  if (!hit) return null;
  return {
    trackListeners: hit.rank === undefined ? undefined : rankToPseudoListeners(hit.rank),
    artistId: hit.artist?.id,
  };
}

export async function deezerArtist(
  artistId: number,
): Promise<Pick<ReferenceStats, "artistListeners"> | null> {
  const data = await get<DeezerArtist>(`/artist/${artistId}`);
  if (!data || data.nb_fan === undefined) return null;
  return { artistListeners: Math.round(data.nb_fan * FAN_TO_LISTENER_RATIO) };
}
