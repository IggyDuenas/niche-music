import { env } from "./env";
import { resolveStats } from "./reference";
import { trackKey } from "./reference/normalize";
import { analyze } from "./score";
import type { AnalysisResult, LibraryTrack, Provider, ScoredTrack } from "./types";
import { scoreTrack } from "./score";

/** Drops repeats — the same song in liked songs and three playlists is one song. */
export function dedupe(tracks: LibraryTrack[]): LibraryTrack[] {
  const seen = new Set<string>();
  const unique: LibraryTrack[] = [];
  for (const track of tracks) {
    const key = trackKey(track.artist, track.title);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(track);
  }
  return unique;
}

export async function runAnalysis(
  tracks: LibraryTrack[],
  provider: Provider | "combined",
): Promise<{ result: AnalysisResult; scored: ScoredTrack[] }> {
  const unique = dedupe(tracks);
  const stats = await resolveStats(unique, { lastfmApiKey: env.lastfmApiKey });

  const scored = unique.map((track) => {
    const found = stats.get(trackKey(track.artist, track.title));
    return scoreTrack(track, found ?? { tags: [], source: "none", approximate: false });
  });

  return { result: analyze(scored, provider), scored };
}

/** Keeps a client-supplied track budget inside a range the rate limits allow. */
export function clampTracks(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 400;
  return Math.min(1000, Math.max(25, Math.round(n)));
}
