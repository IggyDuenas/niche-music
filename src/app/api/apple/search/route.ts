import { NextResponse, type NextRequest } from "next/server";
import { searchAppleCatalog } from "@/lib/apple";
import { ConfigError, env } from "@/lib/env";
import { resolveStats } from "@/lib/reference";
import { trackKey } from "@/lib/reference/normalize";
import { scoreTrack } from "@/lib/score";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Searches the Apple Music catalogue and scores each hit against listener data. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userToken = typeof body.userToken === "string" ? body.userToken : null;
    const term = typeof body.term === "string" ? body.term.slice(0, 120) : "";

    if (!userToken) {
      return NextResponse.json({ error: "Connect Apple Music to search." }, { status: 401 });
    }
    if (term.trim().length === 0) {
      return NextResponse.json({ tracks: [] });
    }

    const found = await searchAppleCatalog(userToken, term);
    if (found.length === 0) {
      return NextResponse.json({ tracks: [] });
    }

    const stats = await resolveStats(found, { lastfmApiKey: env.lastfmApiKey });
    const tracks = found.map((track) =>
      scoreTrack(track, stats.get(trackKey(track.artist, track.title)) ?? {
        tags: [],
        source: "none",
        approximate: false,
      }),
    );

    return NextResponse.json({ tracks });
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const message = error instanceof Error ? error.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
