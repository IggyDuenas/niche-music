import Link from "next/link";
import { env } from "@/lib/env";
import { readSession, type Session } from "@/lib/session";
import { ConnectApple } from "@/components/ConnectApple";
import { FigureField } from "@/components/FigureGrid";
import { Ground } from "@/components/Ground";
import { COLORWAYS } from "@/lib/colorways";

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

  // Server-rendered, so the pick reaches the client in the payload rather than
  // being recomputed — a random colourway here cannot desync hydration.
  const opening = COLORWAYS[Math.floor(Math.random() * COLORWAYS.length)];

  return (
    <Ground colorway={opening} cycle>
      <FigureField />

      <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-14">
        {/*
         * The content sits on its own plate. Cream text laid straight onto the
         * field is unreadable wherever a figure passes behind it, and the plate
         * keeps every colourway legible without dimming the dancers.
         */}
        <div className="w-full max-w-md rounded-[2rem] sm:max-w-lg border border-[var(--color-cream)]/15 bg-black/55 px-7 py-10 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:px-10">
        <h1 className="text-balance text-[2.5rem] font-bold leading-[1.05] tracking-tight sm:text-5xl">
          How niche is your music?
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-cream)]/85">
          Pick a playlist and find out how many people actually listen to the songs in it.
        </p>

        {error && (
          <p className="mt-6 w-full rounded-2xl border border-[var(--color-cream)]/30 bg-black/35 px-4 py-3 text-sm backdrop-blur-sm">
            {error}
          </p>
        )}

        <div className="mt-8 flex w-full flex-col items-stretch gap-3">
          {spotifyConnected ? (
            <Link href="/playlists?source=spotify" className={primaryPill}>
              <PlayMark />
              Pick a playlist
            </Link>
          ) : (
            <a
              href={env.spotify.configured ? "/api/auth/spotify/login" : undefined}
              aria-disabled={!env.spotify.configured}
              className={`${primaryPill} ${env.spotify.configured ? "" : "pointer-events-none opacity-45"}`}
            >
              <SpotifyMark />
              Connect Spotify
            </a>
          )}

          <ConnectApple enabled={env.apple.configured} />
        </div>

        {spotifyConnected && session.spotify?.displayName && (
          <p className="mt-4 text-xs text-[var(--color-cream)]/70">
            Connected as {session.spotify.displayName}
          </p>
        )}
        {!env.spotify.configured && (
          <p className="mt-4 text-xs leading-relaxed text-[var(--color-cream)]/70">
            Spotify needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET. See the README.
          </p>
        )}

        <p className="mt-9 text-xs leading-relaxed text-[var(--color-cream)]/70">
          We check every song against {referenceSource}, which counts how many people play it.
          Nothing is saved on a server.{" "}
          <Link href="/method" className="text-[var(--color-cream)] underline underline-offset-4">
            How it works
          </Link>
          {env.apple.configured && (
            <>
              {" · "}
              <Link href="/search" className="text-[var(--color-cream)] underline underline-offset-4">
                Score one song
              </Link>
            </>
          )}
        </p>
        </div>
      </main>
    </Ground>
  );
}

const primaryPill =
  "flex items-center justify-center gap-2.5 rounded-full bg-[var(--color-cream)] px-7 py-4 text-[15px] font-bold text-[var(--color-ink)] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] transition hover:brightness-105 active:scale-[0.99]";

function PlayMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
      <path d="M1 1.2v11.6a.6.6 0 0 0 .92.5l9.2-5.8a.6.6 0 0 0 0-1L1.92.7A.6.6 0 0 0 1 1.2z" />
    </svg>
  );
}

function SpotifyMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.59 14.42a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 1 1-.33-1.46c4.57-1.04 8.5-.59 11.66 1.34a.75.75 0 0 1 .25 1.03zm1.22-2.94a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.96-1.4a.94.94 0 1 1-.55-1.79c4.36-1.33 9.78-.69 13.49 1.59a.94.94 0 0 1 .31 1.29zm.11-3.06C14.05 8.12 7.9 7.9 4.2 9.02a1.12 1.12 0 1 1-.65-2.15C7.8 5.58 14.59 5.84 19 8.46a1.12 1.12 0 0 1-1.08 1.96z" />
    </svg>
  );
}
