import type { ReferenceStats } from "../types";
import { normalizeArtist, normalizeTitle } from "./normalize";

const ENDPOINT = "https://ws.audioscrobbler.com/2.0/";

type LastfmTrackInfo = {
  track?: {
    name: string;
    listeners?: string;
    playcount?: string;
    artist?: { name: string };
    toptags?: { tag?: { name: string }[] | { name: string } };
  };
  error?: number;
};

type LastfmArtistInfo = {
  artist?: {
    name: string;
    stats?: { listeners?: string; playcount?: string };
    tags?: { tag?: { name: string }[] | { name: string } };
  };
  error?: number;
};

function toArray<T>(value: T[] | T | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

async function call<T>(params: Record<string, string>, apiKey: string): Promise<T | null> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("autocorrect", "1");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    headers: { "User-Agent": "niche-music/0.1 (+https://github.com/IggyDuenas/niche-music)" },
    // Reference data barely moves; let the platform cache it hard.
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function lastfmTrack(
  artist: string,
  title: string,
  apiKey: string,
): Promise<Pick<ReferenceStats, "trackListeners" | "trackPlaycount" | "tags"> | null> {
  const data = await call<LastfmTrackInfo>(
    { method: "track.getInfo", artist: normalizeArtist(artist), track: normalizeTitle(title) },
    apiKey,
  );
  if (!data?.track || data.error) return null;
  return {
    trackListeners: toNumber(data.track.listeners),
    trackPlaycount: toNumber(data.track.playcount),
    tags: toArray(data.track.toptags?.tag).map((t) => t.name),
  };
}

export async function lastfmArtist(
  artist: string,
  apiKey: string,
): Promise<Pick<ReferenceStats, "artistListeners" | "artistPlaycount" | "tags"> | null> {
  const data = await call<LastfmArtistInfo>(
    { method: "artist.getInfo", artist: normalizeArtist(artist) },
    apiKey,
  );
  if (!data?.artist || data.error) return null;
  return {
    artistListeners: toNumber(data.artist.stats?.listeners),
    artistPlaycount: toNumber(data.artist.stats?.playcount),
    tags: toArray(data.artist.tags?.tag).map((t) => t.name),
  };
}
