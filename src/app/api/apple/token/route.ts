import { NextResponse } from "next/server";
import { developerToken } from "@/lib/apple";
import { ConfigError } from "@/lib/env";

export const dynamic = "force-dynamic";

/** MusicKit needs this in the browser to start the Apple Music sign-in flow. */
export async function GET() {
  try {
    return NextResponse.json({ token: await developerToken() });
  } catch (error) {
    const message =
      error instanceof ConfigError
        ? error.message
        : "Could not sign an Apple Music developer token. Check APPLE_PRIVATE_KEY is a valid .p8 key.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
