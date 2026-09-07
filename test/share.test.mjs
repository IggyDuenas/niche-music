import test from "node:test";
import assert from "node:assert/strict";

const { encodeCard, decodeCard, compare, toShareCard } = await import("../src/lib/share.ts");

const card = {
  n: "house party",
  o: "Iggy",
  s: 41.2,
  p: 62.5,
  v: "Off the beaten path",
  t: 87,
  d: 12,
  m: 41000,
  h: [["Stars Will Fall", "Duster", 68]],
  g: "spotify",
};

test("a card survives a round trip through a link", () => {
  const decoded = decodeCard(encodeCard(card));
  // Decoding fills in the fields this minimal card omits, so compare the ones it set.
  for (const [key, value] of Object.entries(card)) {
    assert.deepEqual(decoded[key], value, `${key} did not survive the round trip`);
  }
});

test("encoded cards are URL-safe and short enough to share", () => {
  const encoded = encodeCard(card);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/, "must contain no characters needing escaping");
  assert.ok(encoded.length < 600, `expected a shareable length, got ${encoded.length}`);
});

test("non-ASCII playlist names survive", () => {
  const decoded = decodeCard(encodeCard({ ...card, n: "🌙 late night — café", o: "Gabé" }));
  assert.equal(decoded.n, "🌙 late night — café");
  assert.equal(decoded.o, "Gabé");
});

test("malformed links decode to null rather than throwing", () => {
  for (const bad of [null, undefined, "", "!!!not base64!!!", "eyJub3QiOiJhIGNhcmQi", "a".repeat(5000)]) {
    assert.equal(decodeCard(bad), null, `expected null for ${String(bad).slice(0, 20)}`);
  }
});

test("hostile values from a link are clamped, not trusted", () => {
  const hostile = encodeCard({
    ...card,
    n: "x".repeat(500),
    s: 99999,
    p: -40,
    d: 1e9,
    h: [["y".repeat(500), "z", 1e6]],
    g: "napster",
  });
  const decoded = decodeCard(hostile);
  assert.ok(decoded.n.length <= 80, "long names must be truncated");
  assert.equal(decoded.s, 100, "score is clamped to the top of the range");
  assert.equal(decoded.p, 0, "negative percentile is clamped to zero");
  assert.equal(decoded.d, 100);
  assert.equal(decoded.h[0][2], 100);
  assert.equal(decoded.g, "spotify", "an unknown provider falls back to a known one");
});

test("a card with a missing score still renders as something", () => {
  const decoded = decodeCard(encodeCard({ ...card, s: undefined, m: null, h: [] }));
  assert.equal(decoded.s, 0);
  assert.equal(decoded.m, null);
  assert.deepEqual(decoded.h, []);
});

test("comparison picks a winner and reports the gap", () => {
  assert.deepEqual(compare({ ...card, s: 60 }, { ...card, s: 40 }), {
    winner: "a",
    gap: 20,
    tied: false,
  });
  assert.deepEqual(compare({ ...card, s: 40 }, { ...card, s: 60 }), {
    winner: "b",
    gap: 20,
    tied: false,
  });
});

test("scores within a point are a tie, not a win", () => {
  const result = compare({ ...card, s: 40.2 }, { ...card, s: 40.0 });
  assert.equal(result.tied, true);
  assert.equal(result.winner, null);
});

test("toShareCard trims a full result down to the sharable parts", () => {
  const shared = toShareCard(
    {
      provider: "spotify",
      nicheScore: 44.4,
      percentile: 70,
      verdict: { label: "Crate digger", blurb: "long text that should not travel" },
      matchedTracks: 50,
      deepCutShare: 20,
      mainstreamShare: 15,
      medianTrackListeners: 9000,
      rarestFind: 90,
      artistBreadth: 64,
      genreCount: 9,
      spread: 17,
      distribution: Array.from({ length: 10 }, (_, i) => ({ bucket: `${i * 10}`, count: i })),
      topTags: [{ tag: "slowcore", count: 4, share: 20 }],
      deepestArtists: [{ artist: "Duster", listeners: 41000, trackCount: 3 }],
      mostNiche: [
        { title: "A", artist: "B", nicheScore: 90 },
        { title: "C", artist: "D", nicheScore: 80 },
        { title: "E", artist: "F", nicheScore: 70 },
        { title: "G", artist: "H", nicheScore: 60 },
      ],
    },
    "  house   party  ",
    "Iggy",
  );

  assert.equal(shared.n, "house party", "whitespace is collapsed");
  assert.equal(shared.h.length, 3, "only a few highlights travel");
  assert.equal(shared.v, "Crate digger");
  assert.ok(!("blurb" in shared), "the long blurb is not carried in the link");
});

/* ---------------- the deeper head-to-head ---------------- */

const { rounds, verdict, distributionShares } = await import("../src/lib/share.ts");

const full = {
  ...card,
  ms: 20,
  rf: 91,
  ab: 70,
  gc: 12,
  sp: 18,
  db: [1, 2, 4, 8, 12, 20, 18, 10, 6, 2],
  tg: ["slowcore", "indie", "shoegaze", "ambient", "lo-fi", "dream pop"],
  ar: ["Duster", "Bedhead", "Codeine"],
};

test("a full card still round-trips through a link", () => {
  assert.deepEqual(decodeCard(encodeCard(full)), full);
});

test("a two-card comparison URL stays short enough to send", () => {
  const url = `https://niche.music/vs?a=${encodeCard(full)}&b=${encodeCard(full)}`;
  // Both cards plus the origin have to survive being pasted into a message.
  assert.ok(url.length < 2000, `comparison URL grew to ${url.length} characters`);
});

test("a card missing the new fields decodes to safe defaults", () => {
  // A link generated before these fields existed must not break the page.
  const legacy = decodeCard(encodeCard(card));
  assert.equal(legacy.db.length, 10, "the distribution is always ten buckets");
  assert.deepEqual(legacy.tg, []);
  assert.deepEqual(legacy.ar, []);
  assert.equal(legacy.rf, 0);
});

test("a hostile distribution is forced back to ten buckets", () => {
  const hostile = decodeCard(encodeCard({ ...full, db: [5, 5] }));
  assert.equal(hostile.db.length, 10);
  const tooMany = decodeCard(encodeCard({ ...full, db: new Array(60).fill(3) }));
  assert.equal(tooMany.db.length, 10);
});

test("rounds award each metric in the right direction", () => {
  const obscure = { ...full, s: 70, d: 40, rf: 95, m: 900, ms: 2, ab: 80, sp: 8 };
  const popular = { ...full, s: 30, d: 5, rf: 50, m: 900000, ms: 60, ab: 40, sp: 25 };
  const byKey = Object.fromEntries(rounds(obscure, popular).map((r) => [r.key, r]));

  assert.equal(byKey.overall.winner, "a");
  assert.equal(byKey.deep.winner, "a");
  assert.equal(byKey.rarest.winner, "a");
  // Fewer listeners is the more obscure result, so the smaller number wins.
  assert.equal(byKey.audience.winner, "a", "fewer median listeners should win");
  assert.equal(byKey.hits.winner, "a", "fewer chart hits should win");
  assert.equal(byKey.variety.winner, "a");
  // Low spread means the whole playlist is obscure, not one outlier.
  assert.equal(byKey.commitment.winner, "a", "lower spread should win");
});

test("identical playlists draw every round", () => {
  const result = verdict(full, { ...full });
  assert.equal(result.roundsWon.drawn, result.rounds.length);
  assert.equal(result.roundsWon.a, 0);
  assert.equal(result.roundsWon.b, 0);
  assert.equal(result.tied, true);
});

test("the verdict finds shared and exclusive genres", () => {
  const other = { ...full, tg: ["indie", "techno", "ambient"], ar: ["Duster", "Aphex Twin"] };
  const result = verdict(full, other);

  assert.deepEqual(result.common.artists, ["Duster"]);
  assert.deepEqual(result.common.tags.sort(), ["ambient", "indie"]);
  assert.ok(result.only.a.includes("slowcore"), "A keeps the genres B lacks");
  assert.ok(result.only.b.includes("techno"), "B keeps the genres A lacks");
  assert.ok(!result.only.a.includes("indie"), "shared genres are not listed as exclusive");
});

test("overlap matching ignores case", () => {
  const result = verdict({ ...full, tg: ["Indie"] }, { ...full, tg: ["indie"] });
  assert.equal(result.common.tags.length, 1);
});

test("distribution is compared as shares, not raw counts", () => {
  // The same shape at ten times the length must produce the same curve.
  const small = { ...full, db: [1, 2, 3, 4, 0, 0, 0, 0, 0, 0] };
  const large = { ...full, db: [10, 20, 30, 40, 0, 0, 0, 0, 0, 0] };
  assert.deepEqual(distributionShares(small), distributionShares(large));
  assert.equal(Math.round(distributionShares(small).reduce((a, b) => a + b, 0)), 100);
});

test("an empty distribution does not divide by zero", () => {
  const shares = distributionShares({ ...full, db: new Array(10).fill(0) });
  assert.deepEqual(shares, new Array(10).fill(0));
});

test("rows won by the smaller number say what smaller means", () => {
  const list = rounds(full, { ...full, s: 10 });
  for (const round of list.filter((r) => r.lowerWins)) {
    assert.ok(
      (round.lowerNote ?? "lower is rarer").length > 0,
      `${round.key} needs a note explaining what a lower number means`,
    );
  }
  // Spread is the one where "lower" means steadier rather than rarer.
  const consistency = list.find((r) => r.key === "commitment");
  assert.equal(consistency.lowerNote, "lower is steadier");
  assert.equal(list.find((r) => r.key === "audience").lowerNote, undefined);
});

test("no round label leans on insider vocabulary", () => {
  const jargon = /deep cut|crate|long tail|percentile|log scale|median|obscurity/i;
  for (const round of rounds(full, full)) {
    assert.ok(!jargon.test(round.label), `"${round.label}" reads as jargon`);
    assert.ok(!jargon.test(round.hint), `hint for ${round.key} reads as jargon: ${round.hint}`);
  }
});
