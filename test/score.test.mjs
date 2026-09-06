import test from "node:test";
import assert from "node:assert/strict";

// The source is TypeScript; Node 22 strips types natively for plain .ts files.
const { obscurityFromListeners, scoreTrack, percentileForScore, distribution, median, analyze } =
  await import("../src/lib/score.ts");
const { normalizeTitle, normalizeArtist, trackKey } = await import(
  "../src/lib/reference/normalize.ts"
);

const TRACK_BOUNDS = { lo: 1.5, hi: 6.3 };

test("obscurity is inverted and clamped", () => {
  assert.equal(obscurityFromListeners(0, TRACK_BOUNDS), 100);
  assert.equal(obscurityFromListeners(10_000_000, TRACK_BOUNDS), 0);
  assert.equal(obscurityFromListeners(undefined, TRACK_BOUNDS), null);

  const obscure = obscurityFromListeners(300, TRACK_BOUNDS);
  const popular = obscurityFromListeners(900_000, TRACK_BOUNDS);
  assert.ok(obscure > popular, "fewer listeners must score higher");
});

test("obscurity is monotonic across the range", () => {
  let previous = Infinity;
  for (const listeners of [10, 100, 1_000, 10_000, 100_000, 1_000_000]) {
    const score = obscurityFromListeners(listeners, TRACK_BOUNDS);
    assert.ok(score <= previous, `expected ${listeners} to score no higher than the step before`);
    previous = score;
  }
});

const baseTrack = {
  id: "1",
  title: "Some Song",
  artist: "Some Artist",
  allArtists: ["Some Artist"],
  source: "spotify",
  origin: "Liked songs",
};

test("a track with no reference data is not scored", () => {
  const scored = scoreTrack(baseTrack, { tags: [], source: "none", approximate: false });
  assert.equal(scored.scored, false);
});

test("a track with only artist data still scores", () => {
  const scored = scoreTrack(baseTrack, {
    artistListeners: 500,
    tags: [],
    source: "lastfm",
    approximate: true,
  });
  assert.equal(scored.scored, true);
  assert.ok(scored.nicheScore > 50);
});

test("unscored tracks are excluded from the average", () => {
  const scored = [
    scoreTrack(baseTrack, { trackListeners: 100, artistListeners: 100, tags: [], source: "lastfm", approximate: false }),
    scoreTrack({ ...baseTrack, id: "2" }, { tags: [], source: "none", approximate: false }),
  ];
  const result = analyze(scored, "spotify");
  assert.equal(result.totalTracks, 2);
  assert.equal(result.matchedTracks, 1);
  assert.equal(result.nicheScore, scored[0].nicheScore);
});

test("analyze on an empty library does not divide by zero", () => {
  const result = analyze([], "spotify");
  assert.equal(result.nicheScore, 0);
  assert.equal(result.deepCutShare, 0);
  assert.equal(result.distribution.length, 10);
});

test("percentile is monotonic and bounded", () => {
  let previous = -1;
  for (let score = 0; score <= 100; score += 5) {
    const pct = percentileForScore(score);
    assert.ok(pct >= previous, `percentile dipped at ${score}`);
    assert.ok(pct >= 0 && pct <= 100);
    previous = pct;
  }
});

test("distribution buckets every score including 100", () => {
  const buckets = distribution([0, 5, 55, 100]);
  assert.equal(buckets[0].count, 2);
  assert.equal(buckets[5].count, 1);
  assert.equal(buckets[9].count, 1, "100 belongs in the last bucket, not an eleventh");
});

test("median handles both parities and empties", () => {
  assert.equal(median([]), null);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 3);
});

test("titles are stripped of catalogue decoration", () => {
  assert.equal(normalizeTitle("Weird Fishes / Arpeggi - 2016 Remaster"), "Weird Fishes / Arpeggi");
  assert.equal(normalizeTitle("Song (feat. Someone Else)"), "Song");
  assert.equal(normalizeTitle("Song (Deluxe Edition)"), "Song");
  assert.equal(normalizeTitle("Plain Title"), "Plain Title");
  // A remix is a genuinely different recording, so it must survive.
  assert.equal(normalizeTitle("Song (Four Tet Remix)"), "Song (Four Tet Remix)");
  // Stripping must never empty a title out.
  assert.notEqual(normalizeTitle("(feat. Nobody)"), "");
});

test("artist credits reduce to the primary act", () => {
  assert.equal(normalizeArtist("Artist A, Artist B"), "Artist A");
  assert.equal(normalizeArtist("Artist A & Artist B"), "Artist A");
  assert.equal(normalizeArtist("Artist A feat. Artist B"), "Artist A");
  assert.equal(normalizeArtist("Simple Name"), "Simple Name");
});

test("dedupe keys ignore decoration differences", () => {
  assert.equal(
    trackKey("Radiohead", "Weird Fishes - 2016 Remaster"),
    trackKey("Radiohead", "Weird Fishes"),
  );
});
