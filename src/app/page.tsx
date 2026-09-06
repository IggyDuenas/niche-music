import Link from "next/link";
import { env } from "@/lib/env";
import { readSession, type Session } from "@/lib/session";
import { ConnectApple } from "@/components/ConnectApple";
import { Sky } from "@/components/Sky";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await readSession().catch((): Session => ({}));
  const spotifyConnected = Boolean(session.spotify);
  const referenceSource = env.lastfmApiKey ? "Last.fm" : "Deezer";

  return (
    <>
      <Sky />
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-5 py-16 text-center">
        {/* Balanced rather than hard-broken: a fixed break wraps badly on narrow screens. */}
        <h1 className="text-balance text-[2.6rem] font-bold leading-[1.05] tracking-tight sm:text-6xl">
          How niche is your music taste?
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--color-muted)]">
          Connect your account, pick a playlist, and find out how many people on earth
          actually listen to it. Then send it to a friend and see whose taste really wins.
        </p>

        {error && (
          <p className="mt-6 w-full rounded-lg border border-[var(--color-hot)]/40 bg-[var(--color-hot)]/10 px-4 py-3 text-sm text-[var(--color-hot)]">
            {error}
          </p>
        )}

        <div className="mt-10 grid w-full gap-4 sm:grid-cols-2">
          <div className="flex h-full flex-col">
            <a
              href={
                spotifyConnected
                  ? "/playlists?source=spotify"
                  : env.spotify.configured
                    ? "/api/auth/spotify/login"
                    : undefined
              }
              aria-disabled={!env.spotify.configured}
              className={`panel group flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 transition ${
                env.spotify.configured
                  ? "hover:border-[var(--color-accent)] hover:bg-[var(--color-panel-2)]"
                  : "pointer-events-none opacity-45"
              }`}
            >
              <SpotifyMark />
              <span className="text-base font-semibold">Spotify</span>
              <span className="text-xs text-[var(--color-muted)]">
                {spotifyConnected
                  ? `Connected${session.spotify?.displayName ? ` as ${session.spotify.displayName}` : ""}`
                  : env.spotify.configured
                    ? "Sign in to pick a playlist"
                    : "Not configured"}
              </span>
            </a>
            {!env.spotify.configured && (
              <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
                Needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.
              </p>
            )}
          </div>

          <ConnectApple enabled={env.apple.configured} />
        </div>

        {spotifyConnected && (
          <Link
            href="/playlists?source=spotify"
            className="mt-6 rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            Pick a playlist →
          </Link>
        )}

        <p className="mt-14 max-w-md text-xs leading-relaxed text-[var(--color-muted)]">
          Scores come from {referenceSource} listener counts — how many real people play a
          track worldwide. Nothing is stored on a server, and comparisons travel in the link
          itself.{" "}
          <Link href="/method" className="underline underline-offset-2">
            How the score works
          </Link>
        </p>
      </main>
    </>
  );
}

function SpotifyMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.59 14.42a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 1 1-.33-1.46c4.57-1.04 8.5-.59 11.66 1.34a.75.75 0 0 1 .25 1.03zm1.22-2.94a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.96-1.4a.94.94 0 1 1-.55-1.79c4.36-1.33 9.78-.69 13.49 1.59a.94.94 0 0 1 .31 1.29zm.11-3.06C14.05 8.12 7.9 7.9 4.2 9.02a1.12 1.12 0 1 1-.65-2.15C7.8 5.58 14.59 5.84 19 8.46a1.12 1.12 0 0 1-1.08 1.96z" />
    </svg>
  );
}
