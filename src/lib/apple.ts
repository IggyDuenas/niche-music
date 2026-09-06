import { SignJWT, importPKCS8 } from "jose";
import { env } from "./env";
import type { LibraryTrack } from "./types";

const API = "https://api.music.apple.com";

/** Apple caps developer tokens at six months; we mint short-lived ones. */
const TOKEN_TTL = "12h";

let cached: { token: string; expires: number } | null = null;

/**
 * Signs the developer token MusicKit needs to boot in the browser. This is not
 * a secret — it identifies the app, and the user's own Music-User-Token is what
 * authorizes access to their library.
 */
export async function developerToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;

  const key = await importPKCS8(env.apple.privateKey, "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.apple.keyId })
    .setIssuer(env.apple.teamId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(key);

  cached = { token, expires: Date.now() + 11 * 60 * 60 * 1000 };
  return token;
}

type AppleSong = {
  id: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    isrc?: string;
    artwork?: { url?: string };
    playParams?: { catalogId?: string };
  };
};

type AppleResponse = { data?: AppleSong[]; next?: string };

function artwork(url: string | undefined): string | undefined {
  // Apple returns a template like .../{w}x{h}bb.jpg.
  return url?.replace("{w}", "300").replace("{h}", "300");
}

function toLibraryTrack(song: AppleSong, origin: string, index: number): LibraryTrack | null {
  const name = song.attributes?.name;
  const artistName = song.attributes?.artistName;
  if (!name || !artistName) return null;

  const artists = artistName.split(/\s*(?:,|&|feat\.?|ft\.?|featuring)\s+/i).filter(Boolean);
  return {
    id: song.id || `${origin}-${index}`,
    title: name,
    artist: artists[0] ?? artistName,
    allArtists: artists,
    album: song.attributes?.albumName,
    isrc: song.attributes?.isrc,
    artworkUrl: artwork(song.attributes?.artwork?.url),
    source: "apple",
    origin,
  };
}

async function fetchPage(path: string, devToken: string, userToken: string): Promise<AppleResponse> {
  const response = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    headers: {
      Authorization: `Bearer ${devToken}`,
      "Music-User-Token": userToken,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new AppleMusicError(
      `Apple Music request failed: ${path} (${response.status})`,
      response.status,
    );
  }
  return (await response.json()) as AppleResponse;
}

export class AppleMusicError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function collect(
  startPath: string,
  origin: string,
  max: number,
  devToken: string,
  userToken: string,
): Promise<LibraryTrack[]> {
  const tracks: LibraryTrack[] = [];
  let path: string | undefined = startPath;

  while (path && tracks.length < max) {
    const page: AppleResponse = await fetchPage(path, devToken, userToken);
    for (const song of page.data ?? []) {
      const track = toLibraryTrack(song, origin, tracks.length);
      if (track) tracks.push(track);
      if (tracks.length >= max) break;
    }
    path = page.next;
  }
  return tracks;
}

export async function fetchAppleLibrary(
  userToken: string,
  options: { maxTracks?: number } = {},
): Promise<{ tracks: LibraryTrack[]; warnings: string[] }> {
  const devToken = await developerToken();
  const maxTracks = options.maxTracks ?? 400;
  const warnings: string[] = [];
  const tracks: LibraryTrack[] = [];

  try {
    tracks.push(
      ...(await collect(
        "/v1/me/library/songs?limit=100",
        "Apple Music library",
        Math.ceil(maxTracks * 0.8),
        devToken,
        userToken,
      )),
    );
  } catch {
    warnings.push("Could not read your Apple Music library.");
  }

  // Heavy rotation is what you actually play, which the library alone misses.
  if (tracks.length < maxTracks) {
    try {
      tracks.push(
        ...(await collect(
          "/v1/me/history/heavy-rotation?limit=30",
          "Heavy rotation",
          maxTracks - tracks.length,
          devToken,
          userToken,
        )),
      );
    } catch {
      // Heavy rotation needs listening history the account may not have; not fatal.
    }
  }

  if (tracks.length === 0 && warnings.length === 0) {
    warnings.push("Your Apple Music library looks empty.");
  }

  return { tracks, warnings };
}
