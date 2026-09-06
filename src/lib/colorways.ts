/**
 * The same sleeve, pressed in five colours. Each colourway is a complete set —
 * ground, sleeve, ink, accent — rather than one hue rotated, because the ink on
 * the sleeve has to change with it: cream reads beautifully on the terracotta
 * and the purple, and is unreadable on the yellow.
 */
export type Colorway = {
  id: string;
  label: string;
  /** Page background. */
  ground: string;
  /** Card background, a step up from the ground. */
  panel: string;
  /** The sleeve itself. */
  art: string;
  /** The figures printed on the sleeve. */
  artInk: string;
  /** Bright enough to read as text on the ground. */
  accent: string;
  accentDim: string;
  /** Secondary text. */
  muted: string;
  /** Darkest tone — used for text on cream buttons. */
  deep: string;
};

export const COLORWAYS: Colorway[] = [
  {
    id: "terracotta",
    label: "Terracotta",
    ground: "#4a1210",
    panel: "#5c1a16",
    art: "#e04d38",
    artInk: "#ece9d6",
    accent: "#f2896f",
    accentDim: "#b73c2c",
    muted: "#d5aaa2",
    deep: "#2a0907",
  },
  {
    id: "leaf",
    label: "Leaf",
    ground: "#123024",
    panel: "#1b4030",
    art: "#4aa86c",
    artInk: "#eff3e3",
    accent: "#7fd39a",
    accentDim: "#338554",
    muted: "#a9cbb7",
    deep: "#071a10",
  },
  {
    id: "cobalt",
    label: "Cobalt",
    ground: "#14243f",
    panel: "#1e3255",
    art: "#3f78d8",
    artInk: "#eaf0fb",
    accent: "#88b0f3",
    accentDim: "#2f5cae",
    muted: "#a9bcdb",
    deep: "#080f1e",
  },
  {
    id: "ochre",
    label: "Ochre",
    ground: "#3a2c0c",
    panel: "#4b3b13",
    art: "#e9ba3c",
    // Dark ink here: cream on yellow is illegible, and the sleeve has to work.
    artInk: "#3a2a06",
    accent: "#f2cd6b",
    accentDim: "#b08a20",
    muted: "#d9c79a",
    deep: "#1d1503",
  },
  {
    id: "violet",
    label: "Violet",
    ground: "#291a42",
    panel: "#372457",
    art: "#8f5fd8",
    artInk: "#f0e9fb",
    accent: "#bb9bf0",
    accentDim: "#6d43ab",
    muted: "#c5b3df",
    deep: "#150a26",
  },
];

export const DEFAULT_COLORWAY = COLORWAYS[0];

/** Stable 32-bit hash, so a given playlist always presses in the same colour. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * A playlist's own colourway. Deterministic, so "house party" is always the
 * same colour on your screen and on your friend's — the comparison page shows
 * two different sleeves precisely because they are two different playlists.
 */
export function colorwayFor(seed: string): Colorway {
  return COLORWAYS[hash(seed.trim().toLowerCase()) % COLORWAYS.length];
}

export function nextColorway(current: Colorway): Colorway {
  const index = COLORWAYS.findIndex((c) => c.id === current.id);
  return COLORWAYS[(index + 1) % COLORWAYS.length];
}

/** The colourway as CSS custom properties, for inline application to a wrapper. */
export function colorwayVars(colorway: Colorway): React.CSSProperties {
  return {
    "--color-ground": colorway.ground,
    "--color-panel": colorway.panel,
    "--color-art": colorway.art,
    "--color-art-ink": colorway.artInk,
    "--color-accent": colorway.accent,
    "--color-accent-dim": colorway.accentDim,
    "--color-muted": colorway.muted,
    "--color-ink": colorway.deep,
  } as React.CSSProperties;
}
