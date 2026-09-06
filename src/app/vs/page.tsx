import Link from "next/link";
import { env } from "@/lib/env";
import { readSession, type Session } from "@/lib/session";
import { ConnectApple } from "@/components/ConnectApple";
import { VersusCard } from "@/components/VersusCard";
import { compare, decodeCard } from "@/lib/share";

export const dynamic = "force-dynamic";

export default async function VersusPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const cardA = decodeCard(a);
  const cardB = decodeCard(b);

  if (!cardA) {
    return (
      <Shell>
        <div className="panel p-6 text-center">
          <p className="text-sm text-[var(--color-gold)]">
            That comparison link is not readable. Ask for a fresh one.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm underline">
            Score your own playlist instead
          </Link>
        </div>
      </Shell>
    );
  }

  // Only one card so far: this is an invitation, not yet a result.
  if (!cardB) {
    return <Invitation card={cardA} encoded={a ?? ""} />;
  }

  const { winner, gap, tied } = compare(cardA, cardB);

  return (
    <Shell>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {tied
            ? "Dead heat"
            : winner === "a"
              ? `${cardA.o} wins`
              : `${cardB.o} wins`}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {tied
            ? "These two playlists are equally obscure. Settle it another way."
            : `By ${gap} points. ${winner === "a" ? cardA.o : cardB.o} listens to music fewer people have found.`}
        </p>
      </header>

      <div className="grid items-stretch gap-4 sm:grid-cols-2">
        <VersusCard card={cardA} outcome={tied ? "tie" : winner === "a" ? "win" : "loss"} />
        <VersusCard card={cardB} outcome={tied ? "tie" : winner === "b" ? "win" : "loss"} />
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-block rounded-full bg-[var(--color-cream)] px-6 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:brightness-110"
        >
          Score one of your own
        </Link>
      </div>
    </Shell>
  );
}

async function Invitation({ card, encoded }: { card: Awaited<ReturnType<typeof decodeCard>>; encoded: string }) {
  if (!card) return null;
  const session = await readSession().catch((): Session => ({}));
  const spotifyConnected = Boolean(session.spotify);
  const challengeQuery = encodeURIComponent(encoded);

  return (
    <Shell>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {card.o} thinks their taste is more niche than yours
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Pick one of your playlists and settle it.
        </p>
      </header>

      <div className="mx-auto max-w-md">
        <VersusCard card={card} outcome={null} />
      </div>

      <div className="mx-auto mt-8 grid max-w-md gap-4 sm:grid-cols-2">
        {spotifyConnected ? (
          <Link
            href={`/playlists?source=spotify&vs=${challengeQuery}`}
            className="panel flex flex-col items-center justify-center gap-2 px-6 py-6 text-center transition hover:border-[var(--color-terracotta)]"
          >
            <span className="text-sm font-semibold">Pick a Spotify playlist</span>
            <span className="text-xs text-[var(--color-muted)]">Already connected</span>
          </Link>
        ) : (
          <a
            href={env.spotify.configured ? `/api/challenge?vs=${challengeQuery}` : undefined}
            aria-disabled={!env.spotify.configured}
            className={`panel flex flex-col items-center justify-center gap-2 px-6 py-6 text-center transition ${
              env.spotify.configured
                ? "hover:border-[var(--color-terracotta)]"
                : "pointer-events-none opacity-45"
            }`}
          >
            <span className="text-sm font-semibold">Connect Spotify</span>
            <span className="text-xs text-[var(--color-muted)]">
              {env.spotify.configured ? "Then pick a playlist" : "Not configured"}
            </span>
          </a>
        )}

        <ConnectApple enabled={env.apple.configured} challenge={encoded} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/" className="text-xs text-[var(--color-muted)] underline underline-offset-2">
          ← Niche Music
        </Link>
        <div className="mt-8">{children}</div>
      </main>
    </>
  );
}
