import type { LibraryTrack, ReferenceStats } from "../types";
import { deezerArtist, deezerTrack } from "./deezer";
import { lastfmArtist, lastfmTrack } from "./lastfm";
import { normalizeArtist, trackKey } from "./normalize";

const EMPTY: ReferenceStats = { tags: [], source: "none", approximate: false };

/**
 * Artist lookups repeat constantly — a 500-track library is usually 150-odd
 * artists — so they are cached for the life of the server process. Track
 * lookups are not cached in memory; the fetch layer's revalidate handles those.
 */
const artistCache = new Map<string, { value: ReferenceStats; expires: number }>();
const ARTIST_TTL_MS = 24 * 60 * 60 * 1000;
const ARTIST_CACHE_MAX = 5_000;

/** Reference APIs are rate limited; Last.fm tolerates a handful in flight. */
const CONCURRENCY = 4;

/**
 * Lookups for one artist run concurrently across that artist's tracks, so the
 * cache holds the in-flight promise rather than the settled value. Caching only
 * the result would let every concurrent track for the same artist miss and fire
 * its own request.
 */
const artistInFlight = new Map<string, Promise<ReferenceStats>>();

function cacheGet(key: string): ReferenceStats | undefined {
  const hit = artistCache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    artistCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key: string, value: ReferenceStats) {
  if (artistCache.size >= ARTIST_CACHE_MAX) {
    // Cheap eviction: drop the oldest inserted entry.
    const oldest = artistCache.keys().next().value;
    if (oldest !== undefined) artistCache.delete(oldest);
  }
  artistCache.set(key, { value, expires: Date.now() + ARTIST_TTL_MS });
}

/** Runs `loader` at most once per artist, whether called in sequence or at once. */
function withArtistCache(
  key: string,
  loader: () => Promise<ReferenceStats>,
): Promise<ReferenceStats> {
  const cached = cacheGet(key);
  if (cached) return Promise.resolve(cached);

  const pending = artistInFlight.get(key);
  if (pending) return pending;

  const promise = loader()
    .then((value) => {
      cacheSet(key, value);
      return value;
    })
    .catch(() => EMPTY)
    .finally(() => {
      artistInFlight.delete(key);
    });

  artistInFlight.set(key, promise);
  return promise;
}

/** Runs `worker` over `items` with a bounded number of concurrent calls. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function artistStats(artist: string, apiKey: string): Promise<ReferenceStats> {
  return withArtistCache(normalizeArtist(artist).toLowerCase(), async () => {
    const info = await lastfmArtist(artist, apiKey).catch(() => null);
    if (info?.artistListeners === undefined) return EMPTY;
    return {
      artistListeners: info.artistListeners,
      artistPlaycount: info.artistPlaycount,
      tags: info.tags,
      source: "lastfm" as const,
      approximate: false,
    };
  });
}

/**
 * Looks up worldwide listening data for every track, deduplicated by
 * artist+title. Returns a map keyed by `trackKey(artist, title)`.
 */
export async function resolveStats(
  tracks: LibraryTrack[],
  options: { lastfmApiKey?: string } = {},
): Promise<Map<string, ReferenceStats>> {
  const apiKey = options.lastfmApiKey;
  const unique = new Map<string, LibraryTrack>();
  for (const track of tracks) {
    const key = trackKey(track.artist, track.title);
    if (!unique.has(key)) unique.set(key, track);
  }

  const entries = [...unique.entries()];
  const resolved = await mapWithConcurrency(entries, CONCURRENCY, async ([key, track]) => {
    const stats = apiKey
      ? await viaLastfm(track, apiKey)
      : await viaDeezer(track);
    return [key, stats] as const;
  });

  return new Map(resolved);
}

async function viaLastfm(track: LibraryTrack, apiKey: string): Promise<ReferenceStats> {
  const [trackInfo, artistInfo] = await Promise.all([
    lastfmTrack(track.artist, track.title, apiKey).catch(() => null),
    artistStats(track.artist, apiKey),
  ]);

  const tags = [...(trackInfo?.tags ?? []), ...artistInfo.tags];
  const hasAnything =
    trackInfo?.trackListeners !== undefined || artistInfo.artistListeners !== undefined;

  return {
    trackListeners: trackInfo?.trackListeners,
    trackPlaycount: trackInfo?.trackPlaycount,
    artistListeners: artistInfo.artistListeners,
    artistPlaycount: artistInfo.artistPlaycount,
    tags: [...new Set(tags.map((t) => t.toLowerCase()))].slice(0, 8),
    source: hasAnything ? "lastfm" : "none",
    approximate: trackInfo?.trackListeners === undefined,
  };
}

async function viaDeezer(track: LibraryTrack): Promise<ReferenceStats> {
  const hit = await deezerTrack(track.artist, track.title).catch(() => null);
  if (!hit) return EMPTY;

  const artist = await withArtistCache(normalizeArtist(track.artist).toLowerCase(), async () => {
    const info = hit.artistId ? await deezerArtist(hit.artistId).catch(() => null) : null;
    if (!info) return EMPTY;
    return {
      artistListeners: info.artistListeners,
      tags: [],
      source: "deezer" as const,
      approximate: true,
    };
  });

  return {
    trackListeners: hit.trackListeners,
    artistListeners: artist.artistListeners,
    tags: [],
    source: "deezer",
    // Deezer gives a rank, not a listener count, so every number here is derived.
    approximate: true,
  };
}
