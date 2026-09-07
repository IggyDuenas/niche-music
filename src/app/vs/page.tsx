import Link from "next/link";
import { env } from "@/lib/env";
import { readSession, type Session } from "@/lib/session";
import { ConnectApple } from "@/components/ConnectApple";
import { VersusCard } from "@/components/VersusCard";
import { decodeCard, distributionShares, verdict as buildVerdict } from "@/lib/share";
import { Rounds } from "@/components/versus/Rounds";
import { DistributionOverlay } from "@/components/versus/DistributionOverlay";
import { CommonGround } from "@/components/versus/CommonGround";
import { Panel } from "@/components/Panel";
import { Ground } from "@/components/Ground";
import { colorwayFor, DEFAULT_COLORWAY } from "@/lib/colorways";

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

  const result = buildVerdict(cardA, cardB);
  const { winner, gap, tied, roundsWon } = result;
  const championName = winner === "a" ? cardA.o : cardB.o;

  return (
    <Shell seed={tied || winner === "a" ? cardA.n : cardB.n} wide>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {tied ? "Dead heat" : `${championName} wins`}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {tied
            ? "Level on overall score."
            : `By ${gap} points overall.`}{" "}
          {roundsWon.a === roundsWon.b
            ? `The seven rounds split ${roundsWon.a}-${roundsWon.b}.`
            : `${roundsWon.a > roundsWon.b ? cardA.o : cardB.o} took ${Math.max(roundsWon.a, roundsWon.b)} of the seven rounds.`}
        </p>
      </header>

      <div className="grid items-stretch gap-4 sm:grid-cols-2">
        <VersusCard card={cardA} outcome={tied ? "tie" : winner === "a" ? "win" : "loss"} />
        <VersusCard card={cardB} outcome={tied ? "tie" : winner === "b" ? "win" : "loss"} />
      </div>

      <Panel
        title="Round by round"
        hint="Seven different ways of asking the same question, because one average hides a lot."
        className="mt-4"
      >
        <Rounds rounds={result.rounds} nameA={cardA.n} nameB={cardB.n} />
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="How each playlist breaks down"
          hint="Shown as a percentage of each playlist, so a longer playlist does not just look bigger."
        >
          <DistributionOverlay
            a={distributionShares(cardA)}
            b={distributionShares(cardB)}
            nameA={cardA.n}
            nameB={cardB.n}
          />
        </Panel>

        <Panel title="Where you overlap">
          <CommonGround verdict={result} nameA={cardA.n} nameB={cardB.n} />
        </Panel>
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
    <Shell seed={card.n}>
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
            className="panel flex flex-col items-center justify-center gap-2 px-6 py-6 text-center transition hover:border-[var(--color-accent)]"
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
                ? "hover:border-[var(--color-accent)]"
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

function Shell({
  children,
  seed,
  wide = false,
}: {
  children: React.ReactNode;
  seed?: string;
  wide?: boolean;
}) {
  return (
    <Ground colorway={seed ? colorwayFor(seed) : DEFAULT_COLORWAY}>
      <main className={`mx-auto px-5 py-12 ${wide ? "max-w-4xl" : "max-w-3xl"}`}>
        <Link href="/" className="text-xs text-[var(--color-muted)] underline underline-offset-2">
          ← Niche Music
        </Link>
        <div className="mt-8">{children}</div>
      </main>
    </Ground>
  );
}
