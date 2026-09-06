import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Starts a Spotify login while remembering the challenge the user is answering.
 * The card cannot ride along in the OAuth redirect_uri (Spotify requires an
 * exact registered match), so it is parked in a short-lived cookie that the
 * callback picks up.
 */
export async function GET(request: NextRequest) {
  const card = request.nextUrl.searchParams.get("vs") ?? "";
  const response = NextResponse.redirect(`${env.appUrl}/api/auth/spotify/login`);

  if (card && card.length <= 4000) {
    response.cookies.set("nm_vs", card, {
      httpOnly: true,
      secure: env.appUrl.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
  }
  return response;
}
