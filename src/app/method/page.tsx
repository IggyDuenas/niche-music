import Link from "next/link";
import { env } from "@/lib/env";
import { Ground } from "@/components/Ground";
import { Panel } from "@/components/Panel";
import { COLORWAYS } from "@/lib/colorways";

export const dynamic = "force-dynamic";

export default function MethodPage() {
  const referenceSource = env.lastfmApiKey ? "Last.fm" : "Deezer";

  const opening = COLORWAYS[Math.floor(Math.random() * COLORWAYS.length)];

  return (
    <Ground colorway={opening} cycle>
      <main className="mx-auto max-w-2xl px-5 py-12">
        <Link href="/" className="text-xs text-[var(--color-muted)] underline underline-offset-2">
          ← Niche Music
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">How the score works</h1>

        <Panel className="mt-6">
          <ol className="space-y-3 text-sm leading-relaxed text-[var(--color-muted)]">
            <li>
              <span className="font-medium text-[var(--color-cream)]">1. We read the playlist.</span>{" "}
              Only the playlist you picked. If the same song is in there twice, it counts once.
              Nothing is added to or changed in your account.
            </li>
            <li>
              <span className="font-medium text-[var(--color-cream)]">
                2. We look up how many people play each song.
              </span>{" "}
              Every song and artist is checked against {referenceSource}, which tracks how many
              different people around the world have played them.
            </li>
            <li>
              <span className="font-medium text-[var(--color-cream)]">
                3. We compare fairly across huge differences.
              </span>{" "}
              A worldwide hit can have a million times more listeners than someone recording in
              their bedroom. If we just subtracted one number from the other, every song that
              isn&apos;t a hit would look the same. So we compare them by size of audience — the
              jump from 100 listeners to 1,000 counts the same as the jump from 100,000 to a
              million. Then we flip it round, so a higher score means fewer listeners.
            </li>
            <li>
              <span className="font-medium text-[var(--color-cream)]">4. We weigh two things.</span>{" "}
              A song&apos;s score is a bit more than half about that recording, and a bit less than
              half about how well known the artist is overall. An album track by a famous band is
              not really rare, even if that particular song is rarely played.
            </li>
            <li>
              <span className="font-medium text-[var(--color-cream)]">5. We average it out.</span>{" "}
              Your playlist score is the average across every song we could find. Songs we
              couldn&apos;t find are counted and shown to you, never guessed at.
            </li>
          </ol>
        </Panel>

        <Panel title="What we can and can't know" className="mt-4">
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            Spotify stopped sharing how popular a song is through its developer tools in February
            2026, and Apple Music never shared it at all. So the streaming services tell us{" "}
            <em>what</em> you listen to, and {referenceSource} tells us{" "}
            <em>how many other people do</em>. That is a better answer anyway — it is a count of
            real people rather than a rating out of 100.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            The line that says your music is “rarer than 42% of people&apos;s” is our best estimate,
            not something we measured. Treat it as a rough guide. Everything else on the page comes
            straight from listener counts.
          </p>
        </Panel>

        <Panel title="What gets saved" className="mt-4">
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            Nothing. There is no database. Your Spotify login is kept in a sealed cookie in your
            browser; your Apple Music login stays in the browser tab and disappears when you close
            it. When you send a friend a comparison link, the result is packed inside the link
            itself — which is why neither of you needs an account, and also why anyone you send
            that link to can see that playlist&apos;s score.
          </p>
        </Panel>
      </main>
    </Ground>
  );
}
