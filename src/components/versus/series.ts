/**
 * The two series colours for every head-to-head chart.
 *
 * Fixed rather than taken from each playlist's colourway: a sleeve colour is
 * chosen by a name hash, so two playlists can land on neighbouring hues, and
 * one of them can match the page's own ground. This pair is checked against all
 * five colourway grounds and passes the lightness band, chroma floor, CVD
 * separation, normal-vision floor and 3:1 contrast on each.
 */
export const SERIES = {
  a: "#C8802E",
  b: "#5194D6",
} as const;

export function formatValue(value: number, unit: string): string {
  if (unit === "listeners") {
    if (value <= 0) return "—";
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (unit === "percent") return `${Math.round(value)}%`;
  return `${Math.round(value)}`;
}
