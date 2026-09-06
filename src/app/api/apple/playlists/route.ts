import { NextResponse, type NextRequest } from "next/server";
import { fetchApplePlaylists } from "@/lib/apple";
import { ConfigError } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userToken = typeof body.userToken === "string" ? body.userToken : null;
    if (!userToken) {
      return NextResponse.json({ error: "Missing Apple Music user token." }, { status: 400 });
    }
    return NextResponse.json({ playlists: await fetchApplePlaylists(userToken) });
  } catch (error) {
    const message =
      error instanceof ConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not load your Apple Music playlists.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
