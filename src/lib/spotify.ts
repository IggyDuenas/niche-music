import { env } from "./env";
import type { LibraryTrack } from "./types";
import type { Session } from "./session";

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = [
  "user-library-read",
  "user-top-read",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export function authorizeUrl(state: string): string {
  const url = new URL(`${ACCOUNTS}/authorize`);
  url.searchParams.set("client_id", env.spotify.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", `${env.appUrl}/api/auth/spotify/callback`);
  url.searchParams.set("scope", SPOTIFY_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const basic = Buffer.from(`${env.spotify.clientId}:${env.spotify.clientSecret}`).toString("base64");
  const response = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Spotify token request failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as TokenResponse;
}

export async function exchangeCode(code: string): Promise<Session["spotify"]> {
  const token = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.appUrl}/api/auth/spotify/callback`,
    }),
  );
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + token.expires_in,
  };
}

/** Refreshes the access token when it is within a minute of expiring. */
export async function ensureFreshToken(
  spotify: NonNullable<Session["spotify"]>,
): Promise<NonNullable<Session["spotify"]>> {
  if (spotify.expiresAt - 60 > Math.floor(Date.now() / 1000)) return spotify;
  if (!spotify.refreshToken) throw new Error("Spotify session expired. Reconnect to continue.");

  const token = await tokenRequest(
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: spotify.refreshToken }),
  );
  return {
    ...spotify,
    accessToken: token.access_token,
    // Spotify only sometimes returns a new refresh token; keep the old one otherwise.
    refreshToken: token.refresh_token ?? spotify.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + token.expires_in,
  };
}

class SpotifyClient {
  constructor(private readonly accessToken: string) {}

  async get<T>(path: string): Promise<T> {
    const response = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      cache: "no-store",
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "2");
      await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 10) * 1000));
      return this.get<T>(path);
    }
    if (!response.ok) {
      throw new SpotifyError(
        `Spotify request failed: ${path} (${response.status})`,
        response.status,
      );
    }
    return (await response.json()) as T;
  }

  /** Tries each path in turn, moving on when one is missing or forbidden. */
  async getFirstAvailable<T>(paths: string[]): Promise<T | null> {
    for (const path of paths) {
      try {
        return await this.get<T>(path);
      } catch (error) {
        if (error instanceof SpotifyError && (error.status === 404 || error.status === 403)) continue;
        throw error;
      }
    }
    return null;
  }
}

export class SpotifyError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * Spotify's February 2026 changes renamed the paged collections on several
 * endpoints (`tracks` -> `items`, and each entry's `track` -> `item`). Reading
 * both shapes keeps this working either side of that migration.
 */
type PagedResponse = {
  items?: unknown[];
  tracks?: unknown[];
  next?: string | null;
};

type SpotifyTrackObject = {
  id?: string;
  name?: string;
  artists?: { name: string }[];
  album?: { name?: string; images?: { url: string }[] };
  external_ids?: { isrc?: string };
  is_local?: boolean;
  type?: string;
};

function unwrap(entry: unknown): SpotifyTrackObject | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  // Saved-track and playlist-item wrappers nest the track; top-tracks do not.
  const candidate = (record.track ?? record.item ?? record) as SpotifyTrackObject;
  if (!candidate || typeof candidate !== "object") return null;
  if (candidate.type && candidate.type !== "track") return null;
  if (!candidate.name || !candidate.artists?.length) return null;
  return candidate;
}

function toLibraryTrack(raw: SpotifyTrackObject, origin: string, index: number): LibraryTrack {
  const artists = (raw.artists ?? []).map((a) => a.name).filter(Boolean);
  return {
    id: raw.id ?? `${origin}-${index}`,
    title: raw.name ?? "Unknown",
    artist: artists[0] ?? "Unknown",
    allArtists: artists,
    album: raw.album?.name,
    isrc: raw.external_ids?.isrc,
    artworkUrl: raw.album?.images?.[0]?.url,
    source: "spotify",
    origin,
  };
}

async function paginate(
  client: SpotifyClient,
  paths: string[],
  origin: string,
  max: number,
): Promise<LibraryTrack[]> {
  const collected: LibraryTrack[] = [];
  let page = await client.getFirstAvailable<PagedResponse>(paths);

  while (page && collected.length < max) {
    const entries = page.items ?? page.tracks ?? [];
    for (const entry of entries) {
      const raw = unwrap(entry);
      if (!raw || raw.is_local) continue;
      collected.push(toLibraryTrack(raw, origin, collected.length));
      if (collected.length >= max) break;
    }
    if (!page.next || collected.length >= max) break;
    page = await client.get<PagedResponse>(page.next);
  }
  return collected;
}

export type SpotifyFetchOptions = {
  /** Upper bound on tracks pulled, to keep an analysis fast and inside rate limits. */
  maxTracks?: number;
  includePlaylists?: boolean;
};

export async function fetchLibrary(
  accessToken: string,
  options: SpotifyFetchOptions = {},
): Promise<{ tracks: LibraryTrack[]; warnings: string[] }> {
  const client = new SpotifyClient(accessToken);
  const maxTracks = options.maxTracks ?? 400;
  const warnings: string[] = [];
  const tracks: LibraryTrack[] = [];

  const budget = () => Math.max(0, maxTracks - tracks.length);

  // Liked songs are the best single signal, so they get the largest share.
  try {
    tracks.push(
      ...(await paginate(
        client,
        ["/me/tracks?limit=50", "/me/library?limit=50"],
        "Liked songs",
        Math.min(budget(), Math.ceil(maxTracks * 0.6)),
      )),
    );
  } catch {
    warnings.push("Could not read your liked songs.");
  }

  for (const range of ["long_term", "medium_term"] as const) {
    if (budget() === 0) break;
    try {
      tracks.push(
        ...(await paginate(
          client,
          [`/me/top/tracks?limit=50&time_range=${range}`],
          range === "long_term" ? "Top tracks (all time)" : "Top tracks (6 months)",
          Math.min(budget(), 50),
        )),
      );
    } catch {
      warnings.push(`Could not read your ${range.replace("_", " ")} top tracks.`);
    }
  }

  if (options.includePlaylists !== false && budget() > 0) {
    try {
      const playlists = await client.get<{ items?: { id: string; name: string; tracks?: { total?: number } }[] }>(
        "/me/playlists?limit=20",
      );
      for (const playlist of playlists.items ?? []) {
        if (budget() === 0) break;
        const fromPlaylist = await paginate(
          client,
          [`/playlists/${playlist.id}/tracks?limit=50`, `/playlists/${playlist.id}/items?limit=50`],
          `Playlist: ${playlist.name}`,
          Math.min(budget(), 60),
        );
        tracks.push(...fromPlaylist);
      }
    } catch {
      warnings.push("Could not read your playlists.");
    }
  }

  if (tracks.length === 0 && warnings.length === 0) {
    warnings.push("Your Spotify library looks empty.");
  }

  return { tracks, warnings };
}

export async function fetchProfile(accessToken: string): Promise<{ displayName?: string }> {
  try {
    const me = await new SpotifyClient(accessToken).get<{ display_name?: string; id?: string }>("/me");
    return { displayName: me.display_name ?? me.id };
  } catch {
    // The February 2026 changes trimmed profile fields; a name is optional here.
    return {};
  }
}
