import Link from "next/link";
import { env } from "@/lib/env";
import { readSession, type Session } from "@/lib/session";
import { ConnectApple } from "@/components/ConnectApple";
import { CoverArt } from "@/components/FigureGrid";

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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center px-6 pb-16 pt-12 text-center sm:pt-20">
      <CoverArt className="w-full max-w-[340px]" />

      <h1 className="mt-9 text-balance text-[2.15rem] font-bold leading-[1.08] tracking-tight sm:text-[2.6rem]">
        How niche is your music taste?
      </h1>
      <p className="mt-2 text-lg font-medium text-[var(--color-muted)]">
        Spotify &amp; Apple Music
      </p>
      <p className="mt-2 text-[13px] font-semibold tracking-wide text-[var(--color-terracotta)]">
        One playlist · Scored on {referenceSource}
      </p>

      {error && (
        <p className="mt-6 w-full rounded-2xl border border-[var(--color-terracotta)]/45 bg-[var(--color-terracotta)]/12 px-4 py-3 text-sm">
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
            className={`${primaryPill} ${env.spotify.configured ? "" : "pointer-events-none opacity-40"}`}
          >
            <SpotifyMark />
            Connect Spotify
          </a>
        )}

        <ConnectApple enabled={env.apple.configured} />
      </div>

      {spotifyConnected && session.spotify?.displayName && (
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          Connected as {session.spotify.displayName}
        </p>
      )}
      {!env.spotify.configured && (
        <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">
          Spotify needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET. See the README.
        </p>
      )}

      <div className="mt-auto pt-14">
        <p className="text-xs leading-relaxed text-[var(--color-muted)]">
          Scores come from {referenceSource} listener counts — how many real people play a
          track worldwide. Nothing is stored on a server.
        </p>
        <Link
          href="/method"
          className="mt-2 inline-block text-xs text-[var(--color-cream)] underline underline-offset-4"
        >
          How the score works
        </Link>
      </div>
    </main>
  );
}

const primaryPill =
  "flex items-center justify-center gap-2.5 rounded-full bg-[var(--color-cream)] px-7 py-4 text-[15px] font-bold text-[var(--color-ink)] transition hover:brightness-105 active:scale-[0.99]";

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
