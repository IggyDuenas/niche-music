import { NextResponse, type NextRequest } from "next/server";
import { fetchAppleLibrary } from "@/lib/apple";
import { clampTracks, runAnalysis } from "@/lib/analyze";
import { ConfigError } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userToken = typeof body.userToken === "string" ? body.userToken : null;
    if (!userToken) {
      return NextResponse.json({ error: "Missing Apple Music user token." }, { status: 400 });
    }

    const { tracks, warnings } = await fetchAppleLibrary(userToken, {
      maxTracks: clampTracks(body.maxTracks),
    });

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "No tracks found in your Apple Music library.", warnings },
        { status: 422 },
      );
    }

    const { result } = await runAnalysis(tracks, "apple");
    return NextResponse.json({ result, warnings });
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
