import Link from "next/link";
import { env } from "@/lib/env";
import { readSession, type Session } from "@/lib/session";
import { ConnectApple } from "@/components/ConnectApple";
import { Panel } from "@/components/Panel";

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
    <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
        Niche Music
      </p>
      <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
        How obscure is your taste,
        <br />
        <span className="text-[var(--color-muted)]">actually?</span>
      </h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--color-muted)]">
        Connect your streaming account and every song in your library gets checked against
        worldwide listening data — how many people on earth actually listen to this. You get one
        score, and the receipts to back it up.
      </p>

      {error && (
        <p className="mt-6 rounded-lg border border-[var(--color-hot)]/40 bg-[var(--color-hot)]/10 px-4 py-3 text-sm text-[var(--color-hot)]">
          {error}
        </p>
      )}

      <div className="mt-9 grid gap-3 sm:grid-cols-2">
        <div>
          {spotifyConnected ? (
            <Link
              href="/results?source=spotify"
              className="block w-full rounded-xl bg-[var(--color-accent)] px-5 py-3.5 text-center text-sm font-semibold text-black transition hover:brightness-110"
            >
              Analyse my Spotify library
            </Link>
          ) : (
            <a
              href={env.spotify.configured ? "/api/auth/spotify/login" : undefined}
              aria-disabled={!env.spotify.configured}
              className={`block w-full rounded-xl px-5 py-3.5 text-center text-sm font-semibold transition ${
                env.spotify.configured
                  ? "bg-[var(--color-accent)] text-black hover:brightness-110"
                  : "pointer-events-none bg-[var(--color-panel-2)] text-[var(--color-muted)] opacity-45"
              }`}
            >
              Connect Spotify
            </a>
          )}
          {!env.spotify.configured && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET. See the README.
            </p>
          )}
          {spotifyConnected && session.spotify?.displayName && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Connected as {session.spotify.displayName}.
            </p>
          )}
        </div>

        <ConnectApple enabled={env.apple.configured} />
      </div>

      <Panel title="How the score works" className="mt-14">
        <ol className="space-y-3 text-sm leading-relaxed text-[var(--color-muted)]">
          <li>
            <span className="font-medium text-[var(--color-chalk)]">1. Read your library.</span>{" "}
            Liked songs, top tracks and playlists from Spotify; saved songs and heavy rotation
            from Apple Music. Nothing is written back, and nothing is stored on a server.
          </li>
          <li>
            <span className="font-medium text-[var(--color-chalk)]">2. Look up real audience size.</span>{" "}
            Every track and artist is matched against {referenceSource}, which reports how many
            distinct people worldwide have listened to them.
          </li>
          <li>
            <span className="font-medium text-[var(--color-chalk)]">3. Score on a log scale.</span>{" "}
            A global hit has roughly a million times the audience of a bedroom producer, so counts
            are compared logarithmically. 55% of each track&apos;s score comes from the recording,
            45% from the artist&apos;s overall reach.
          </li>
        </ol>
        <p className="mt-4 border-t border-[var(--color-edge)] pt-4 text-xs leading-relaxed text-[var(--color-muted)]">
          Spotify removed track and artist popularity from its API in February 2026, and Apple
          Music never exposed it, so the streaming services tell us <em>what</em> you listen to
          and {referenceSource} tells us <em>how many others do</em>.
        </p>
      </Panel>
    </main>
  );
}
