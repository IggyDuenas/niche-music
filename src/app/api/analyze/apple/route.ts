import { NextResponse, type NextRequest } from "next/server";
import { fetchAppleLibrary, fetchApplePlaylistTracks } from "@/lib/apple";
import { clampTracks, runAnalysis } from "@/lib/analyze";
import { ConfigError } from "@/lib/env";
import { toShareCard } from "@/lib/share";
import type { LibraryTrack } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userToken = typeof body.userToken === "string" ? body.userToken : null;
    if (!userToken) {
      return NextResponse.json({ error: "Missing Apple Music user token." }, { status: 400 });
    }

    const maxTracks = clampTracks(body.maxTracks);
    const playlistId = typeof body.playlistId === "string" ? body.playlistId : null;
    const playlistName = typeof body.playlistName === "string" ? body.playlistName : "Playlist";
    const owner = typeof body.owner === "string" ? body.owner : "You";

    let tracks: LibraryTrack[];
    let warnings: string[] = [];
    let label: string;

    if (playlistId) {
      tracks = await fetchApplePlaylistTracks(userToken, playlistId, playlistName, maxTracks);
      label = playlistName;
    } else {
      const library = await fetchAppleLibrary(userToken, { maxTracks });
      tracks = library.tracks;
      warnings = library.warnings;
      label = "Everything";
    }

    if (tracks.length === 0) {
      return NextResponse.json({ error: `No songs found in "${label}".`, warnings }, { status: 422 });
    }

    const { result } = await runAnalysis(tracks, "apple");
    return NextResponse.json({
      result,
      warnings,
      label,
      card: toShareCard(result, label, owner),
    });
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
