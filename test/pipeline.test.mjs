import test from "node:test";
import assert from "node:assert/strict";

process.env.LASTFM_API_KEY = "test-key";
process.env.SESSION_SECRET = "test-secret";

const { runAnalysis, dedupe } = await import("../src/lib/analyze.ts");

/** Canned Last.fm responses, shaped exactly like the real API's JSON. */
const CORPUS = {
  "radiohead::weird fishes/ arpeggi": { listeners: "412000", playcount: "5100000" },
  "radiohead": { listeners: "5900000", playcount: "480000000" },
  "duster::stars will fall": { listeners: "41000", playcount: "310000" },
  "duster": { listeners: "290000", playcount: "9800000" },
  "some bedroom act::untitled 3": { listeners: "180", playcount: "900" },
  "some bedroom act": { listeners: "620", playcount: "4100" },
  "cache probe::song one": { listeners: "500", playcount: "2000" },
  "cache probe::song two": { listeners: "400", playcount: "1800" },
  "cache probe::song three": { listeners: "300", playcount: "1500" },
  "cache probe": { listeners: "7000", playcount: "40000" },
};

function stubFetch() {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const method = url.searchParams.get("method");
    const artist = (url.searchParams.get("artist") ?? "").toLowerCase();
    const track = (url.searchParams.get("track") ?? "").toLowerCase();
    calls.push({ method, artist, track });

    const json = (body) => new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    if (method === "track.getInfo") {
      const hit = CORPUS[`${artist}::${track}`];
      if (!hit) return json({ error: 6, message: "Track not found" });
      return json({
        track: {
          name: track,
          listeners: hit.listeners,
          playcount: hit.playcount,
          toptags: { tag: [{ name: "Indie" }, { name: "slowcore" }] },
        },
      });
    }
    if (method === "artist.getInfo") {
      const hit = CORPUS[artist];
      if (!hit) return json({ error: 6, message: "Artist not found" });
      return json({
        artist: {
          name: artist,
          stats: { listeners: hit.listeners, playcount: hit.playcount },
          // A single-object tag, which Last.fm returns when there is only one.
          tags: { tag: { name: "Rock" } },
        },
      });
    }
    return json({});
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

const track = (artist, title, origin = "Liked songs") => ({
  id: `${artist}-${title}`,
  title,
  artist,
  allArtists: [artist],
  source: "spotify",
  origin,
});

test("dedupe collapses the same song across playlists", () => {
  const unique = dedupe([
    track("Duster", "Stars Will Fall", "Liked songs"),
    track("Duster", "Stars Will Fall - Remastered", "Playlist: sad hours"),
    track("Radiohead", "Weird Fishes/ Arpeggi"),
  ]);
  assert.equal(unique.length, 2);
});

test("end-to-end analysis ranks obscure above mainstream", async () => {
  const stub = stubFetch();
  try {
    const { result, scored } = await runAnalysis(
      [
        track("Radiohead", "Weird Fishes/ Arpeggi"),
        track("Duster", "Stars Will Fall"),
        track("Some Bedroom Act", "Untitled 3"),
        track("Nobody At All", "Unmatched Song"),
      ],
      "spotify",
    );

    assert.equal(result.totalTracks, 4);
    assert.equal(result.matchedTracks, 3, "the unmatched track must not be scored");

    const byTitle = Object.fromEntries(scored.map((t) => [t.title, t.nicheScore]));
    assert.ok(
      byTitle["Untitled 3"] > byTitle["Stars Will Fall"],
      "the bedroom act should out-score Duster",
    );
    assert.ok(
      byTitle["Stars Will Fall"] > byTitle["Weird Fishes/ Arpeggi"],
      "Duster should out-score Radiohead",
    );

    assert.equal(result.mostNiche[0].title, "Untitled 3");
    assert.equal(result.mostMainstream[0].title, "Weird Fishes/ Arpeggi");
    assert.ok(result.percentile > 0 && result.percentile <= 100);
    assert.ok(result.verdict.label.length > 0);

    // Tags are lowercased and deduplicated across track and artist responses.
    assert.ok(result.topTags.some((t) => t.tag === "indie"));
    assert.ok(result.topTags.every((t) => t.tag === t.tag.toLowerCase()));
  } finally {
    stub.restore();
  }
});

test("artist lookups are cached across tracks by the same artist", async () => {
  const stub = stubFetch();
  try {
    // A fresh artist name, so the cache from earlier tests cannot mask the result.
    await runAnalysis(
      [
        track("Cache Probe", "Song One"),
        track("Cache Probe", "Song Two"),
        track("Cache Probe", "Song Three"),
      ],
      "spotify",
    );
    const artistCalls = stub.calls.filter(
      (c) => c.method === "artist.getInfo" && c.artist === "cache probe",
    );
    const trackCalls = stub.calls.filter((c) => c.method === "track.getInfo");
    assert.equal(artistCalls.length, 1, "the artist should only be looked up once");
    assert.equal(trackCalls.length, 3, "each distinct track is still looked up");
  } finally {
    stub.restore();
  }
});
