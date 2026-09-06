import Link from "next/link";
import { env } from "@/lib/env";
import { Panel } from "@/components/Panel";

export const dynamic = "force-dynamic";

export default function MethodPage() {
  const referenceSource = env.lastfmApiKey ? "Last.fm" : "Deezer";

  return (
    <>
      <main className="mx-auto max-w-2xl px-5 py-12">
        <Link href="/" className="text-xs text-[var(--color-muted)] underline underline-offset-2">
          ← Niche Music
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">How the score works</h1>

        <Panel className="mt-6">
          <ol className="space-y-3 text-sm leading-relaxed text-[var(--color-muted)]">
            <li>
              <span className="font-medium text-[var(--color-cream)]">1. Read the playlist.</span>{" "}
              Only the playlist you picked, deduplicated, so the same song across four playlists
              counts once. Nothing is written back to your account.
            </li>
            <li>
              <span className="font-medium text-[var(--color-cream)]">2. Look up audience size.</span>{" "}
              Each track and artist is matched against {referenceSource}, which reports how many
              distinct people worldwide have played them.
            </li>
            <li>
              <span className="font-medium text-[var(--color-cream)]">3. Score on a log scale.</span>{" "}
              A global hit has roughly a million times the audience of a bedroom producer, so raw
              counts would put everything at one end. Counts are compared as log10, then inverted:
              higher score means fewer listeners.
            </li>
            <li>
              <span className="font-medium text-[var(--color-cream)]">4. Blend.</span> 55% of a
              track&apos;s score comes from the recording, 45% from the artist&apos;s overall reach.
              A deep cut by a famous band is not as niche as the same play count from someone
              nobody has heard of.
            </li>
            <li>
              <span className="font-medium text-[var(--color-cream)]">5. Average.</span> The
              playlist score is the mean across every track that matched. Tracks with no match are
              counted and reported, never guessed at.
            </li>
          </ol>
        </Panel>

        <Panel title="What we can and can't know" className="mt-4">
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            Spotify removed track and artist popularity from its API in February 2026, and Apple
            Music never exposed it. So the streaming services tell us <em>what</em> you listen to,
            and {referenceSource} tells us <em>how many others do</em>. That is a better signal
            anyway — it is a count of real people rather than a 0–100 index.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            The percentile — “more obscure than X% of listeners” — comes from a calibration curve,
            not from measured data. It is a stated assumption, and it is the one number here worth
            treating as a rough guide.
          </p>
        </Panel>

        <Panel title="What gets stored" className="mt-4">
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            Nothing. There is no database. Your Spotify tokens live in a signed, httpOnly cookie;
            the Apple Music token stays in your browser tab. Comparison links carry the whole
            result inside the URL, which is why sharing needs no account on either side — and why
            anyone with the link can read that playlist&apos;s score.
          </p>
        </Panel>
      </main>
    </>
  );
}
