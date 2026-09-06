import { NextResponse } from "next/server";
import { readSession, writeSession } from "@/lib/session";
import { ensureFreshToken, fetchPlaylists } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await readSession();
    if (!session.spotify) {
      return NextResponse.json({ error: "Not connected to Spotify." }, { status: 401 });
    }

    const spotify = await ensureFreshToken(session.spotify);
    if (spotify.accessToken !== session.spotify.accessToken) {
      await writeSession({ ...session, spotify });
    }

    return NextResponse.json({
      playlists: await fetchPlaylists(spotify.accessToken),
      displayName: spotify.displayName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load your playlists.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
