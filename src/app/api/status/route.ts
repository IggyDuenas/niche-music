import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { readSession, type Session } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Tells the UI which providers are configured and whether Spotify is connected. */
export async function GET() {
  const session = await readSession().catch((): Session => ({}));
  return NextResponse.json({
    spotify: {
      configured: env.spotify.configured,
      connected: Boolean(session.spotify),
      displayName: session.spotify?.displayName,
    },
    apple: { configured: env.apple.configured },
    reference: env.lastfmApiKey ? "lastfm" : "deezer",
  });
}
