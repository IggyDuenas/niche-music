import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { readSession, writeSession } from "@/lib/session";
import { exchangeCode, fetchProfile } from "@/lib/spotify";

export const dynamic = "force-dynamic";

function fail(reason: string) {
  return NextResponse.redirect(`${env.appUrl}/?error=${encodeURIComponent(reason)}`);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const denied = params.get("error");
  if (denied) return fail(denied === "access_denied" ? "You declined the Spotify permissions." : denied);

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get("nm_oauth_state")?.value;

  if (!code) return fail("Spotify did not send an authorization code.");
  if (!state || state !== expectedState) return fail("Login state did not match. Please try again.");

  try {
    const spotify = await exchangeCode(code);
    if (!spotify) return fail("Could not complete the Spotify login.");

    const profile = await fetchProfile(spotify.accessToken);
    const session = await readSession();
    await writeSession({ ...session, spotify: { ...spotify, displayName: profile.displayName } });

    const response = NextResponse.redirect(`${env.appUrl}/results`);
    response.cookies.delete("nm_oauth_state");
    return response;
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Spotify login failed.");
  }
}
