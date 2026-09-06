import { NextResponse, type NextRequest } from "next/server";
import { clampTracks, runAnalysis } from "@/lib/analyze";
import { ConfigError } from "@/lib/env";
import { readSession, writeSession } from "@/lib/session";
import { ensureFreshToken, fetchLibrary } from "@/lib/spotify";

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

    const { tracks, warnings } = await fetchLibrary(spotify.accessToken, {
      maxTracks,
      includePlaylists: body.includePlaylists !== false,
    });

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "No tracks found in your Spotify account.", warnings },
        { status: 422 },
      );
    }

    const { result } = await runAnalysis(tracks, "spotify");
    return NextResponse.json({ result, warnings });
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
