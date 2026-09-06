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
  assert.deepEqual(decoded, card);
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
      medianTrackListeners: 9000,
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
