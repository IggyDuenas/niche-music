# Niche Music

Connect Spotify or Apple Music, and every song in your library gets scored
against worldwide listening data. You get one number — how obscure your taste
actually is — plus the breakdown behind it.

## Why the data comes from somewhere else

The obvious design would read a popularity score straight from the streaming
service. That is no longer possible:

- Spotify **deprecated** `audio-features`, `audio-analysis`, `recommendations`
  and related endpoints in November 2024 for any app without prior quota
  approval.
- Spotify's **February 2026** changes went further and removed `popularity`
  from track, artist and album objects, along with `followers`,
  `available_markets`, artist top-tracks and the browse endpoints, for
  development-mode apps.
- Apple Music has **never** exposed a popularity figure.

So the two roles are split:

| Role | Provider |
| --- | --- |
| What you listen to | Spotify, Apple Music |
| How many other people listen to it | Last.fm (primary), Deezer (fallback) |

Last.fm reports distinct `listeners` and total `playcount` per track and per
artist, which is a better niche signal than a 0–100 popularity index anyway.
Deezer needs no API key at all, so the app works before you configure anything,
at the cost of a coarser score — it publishes a `rank`, not a listener count,
so those numbers are approximations on the same log scale.

## How the score works

1. **Read the library.** Spotify: liked songs, top tracks (all-time and
   6-month), and your first 20 playlists. Apple Music: saved songs and heavy
   rotation. Capped at 400 tracks by default and deduplicated, so the same song
   across four playlists counts once.
2. **Look up audience size.** Each unique track and artist is matched against
   the reference corpus. Titles are cleaned first — `"Weird Fishes / Arpeggi -
   2016 Remaster"` will not match anything as written, but `"Weird Fishes /
   Arpeggi"` will. Remixes are deliberately left alone, since a remix is a
   different recording with a different audience.
3. **Score on a log scale.** A global hit has roughly a million times the
   audience of a bedroom producer, so raw counts would put everything at one
   end. Listener counts are compared as `log10`, mapped onto 0–100 and
   inverted, so *higher means fewer listeners*.
4. **Blend.** 55% of a track's score comes from the recording, 45% from the
   artist's overall reach — a deep cut by a famous band is not as niche as the
   same play count from someone nobody has heard of.
5. **Average.** The library score is the mean across every track that matched.
   Tracks with no match are reported separately and left out rather than
   guessed at.

Everything in steps 3–5 lives in [`src/lib/score.ts`](src/lib/score.ts), with
the constants named and commented. The bounds are the honest knobs: change
`TRACK_BOUNDS` and `ARTIST_BOUNDS` and every score moves.

### Calibrating the percentile

The "more obscure than X% of listeners" line comes from `BASELINE_CURVE` in
`src/lib/score.ts`. Those anchors are a **stated assumption, not a
measurement** — they encode the belief that a chart-driven listener lands in
the low 20s. Once you have enough real submitted libraries, replace the curve
with actual percentiles from your own data. Nothing else needs to change.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

**`SESSION_SECRET`** (required) — `openssl rand -base64 32`.

**Spotify** — create an app at
[developer.spotify.com/dashboard](https://developer.spotify.com/dashboard), add
`http://127.0.0.1:3000/api/auth/spotify/callback` as a redirect URI, and copy
the client ID and secret. Spotify rejects `localhost` in redirect URIs, so use
`127.0.0.1`. A development-mode app only works for accounts you add to its
allowlist in the dashboard.

**Last.fm** (recommended) — get a key at
[last.fm/api/account/create](https://www.last.fm/api/account/create). It is
free and instant, with no approval step. Skip it and the app uses Deezer.

**Apple Music** (optional) — needs a paid Apple Developer account. Create a
MusicKit identifier and a private key, then set `APPLE_TEAM_ID`, `APPLE_KEY_ID`
and the contents of the `.p8` file as `APPLE_PRIVATE_KEY`. The server signs a
short-lived ES256 developer token; the user's own Music-User-Token is obtained
in the browser by MusicKit JS and is never stored.

```bash
npm run dev      # http://127.0.0.1:3000
npm test         # scoring and pipeline tests, no network needed
npm run typecheck
npm run build
```

## What is stored

Nothing server-side. There is no database. The Spotify tokens live in a signed,
httpOnly session cookie; the Apple Music user token is passed once per analysis
and never persisted. Analysis results are held in the browser's `sessionStorage`
for the Apple Music flow and discarded on read. The only long-lived cache is
artist listener counts, which is public reference data, held in memory for a
day.

## Deploying

Any Node host works. On Vercel, set every variable from `.env.example` in the
project settings, set `APP_URL` to the deployed origin, and add
`$APP_URL/api/auth/spotify/callback` to the Spotify app's redirect URIs. The
analyze routes declare `maxDuration = 120` because a few hundred tracks means a
few hundred reference lookups.

## Known limits

- Reference lookups are one HTTP call per unique track, run four at a time to
  respect Last.fm's rate limit. 400 tracks takes roughly 30 seconds.
- Match rate is not 100%. Regional releases, very new uploads and heavily
  decorated titles miss; those tracks are excluded from the score and counted
  in the results.
- Spotify's playlist endpoints were renamed in the February 2026 migration
  (`tracks` → `items`). The client reads both shapes, so it works either side of
  that change, but this could not be verified against the live API from the
  build environment.
- The Deezer fallback derives pseudo-listener counts from a rank. It is good
  enough to rank your own library against itself, but the absolute numbers are
  not real listener counts. Use Last.fm if the number matters.
