import { NextResponse, type NextRequest } from "next/server";
import { clampTracks, runAnalysis } from "@/lib/analyze";
import { ConfigError } from "@/lib/env";
import { readSession, writeSession } from "@/lib/session";
import { ensureFreshToken, fetchLibrary, fetchLikedSongs, fetchPlaylistTracks } from "@/lib/spotify";
import { toShareCard } from "@/lib/share";
import type { LibraryTrack } from "@/lib/types";

export const dynamic = "force-dynamic";
// Reference lookups for a few hundred tracks take a while.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const session = await readSession();
    if (!session.spotify) {
      return NextResponse.json({ error: "Not connected to Spotify." }, { status: 401 });
    }

    const spotify = await ensureFreshToken(session.spotify);
    if (spotify.accessToken !== session.spotify.accessToken) {
      await writeSession({ ...session, spotify });
    }

    const body = await request.json().catch(() => ({}));
    const maxTracks = clampTracks(body.maxTracks);
    const playlistId = typeof body.playlistId === "string" ? body.playlistId : null;
    const playlistName = typeof body.playlistName === "string" ? body.playlistName : "Playlist";

    let tracks: LibraryTrack[];
    let warnings: string[] = [];
    let label: string;

    if (playlistId === "liked") {
      tracks = await fetchLikedSongs(spotify.accessToken, maxTracks);
      label = "Liked songs";
    } else if (playlistId) {
      tracks = await fetchPlaylistTracks(spotify.accessToken, playlistId, playlistName, maxTracks);
      label = playlistName;
    } else {
      const library = await fetchLibrary(spotify.accessToken, { maxTracks });
      tracks = library.tracks;
      warnings = library.warnings;
      label = "Everything";
    }

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: `No songs found in "${label}".`, warnings },
        { status: 422 },
      );
    }

    const { result } = await runAnalysis(tracks, "spotify");
    const owner = spotify.displayName ?? "You";
    return NextResponse.json({
      result,
      warnings,
      label,
      card: toShareCard(result, label, owner),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof ConfigError) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const message = error instanceof Error ? error.message : "Analysis failed.";
  const unauthorized = message.includes("401") || message.toLowerCase().includes("expired");
  return NextResponse.json({ error: message }, { status: unauthorized ? 401 : 500 });
}
