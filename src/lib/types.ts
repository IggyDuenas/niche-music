/** A track as it exists in a user's library, normalized across providers. */
export type LibraryTrack = {
  /** Stable id within the source provider. */
  id: string;
  title: string;
  /** Primary artist. Featured artists live in `allArtists`. */
  artist: string;
  allArtists: string[];
  album?: string;
  /** International Standard Recording Code, when the provider exposes it. */
  isrc?: string;
  artworkUrl?: string;
  source: Provider;
  /** Where in the library this came from — liked songs, a playlist, top tracks. */
  origin: string;
};

export type Provider = "spotify" | "apple";

/** Worldwide listening data for a track, from the reference corpus. */
export type ReferenceStats = {
  /** Distinct listeners for this recording. */
  trackListeners?: number;
  /** Total plays for this recording. */
  trackPlaycount?: number;
  /** Distinct listeners for the artist across their whole catalogue. */
  artistListeners?: number;
  artistPlaycount?: number;
  /** Crowd-sourced genre tags, most-used first. */
  tags: string[];
  /** Which provider answered. `none` means we found no match at all. */
  source: "lastfm" | "deezer" | "none";
  /** True when we matched on a fuzzy title/artist search rather than an exact hit. */
  approximate: boolean;
};

/** A single track after scoring. */
export type ScoredTrack = LibraryTrack & {
  stats: ReferenceStats;
  /** 0-100. Higher means fewer people in the world listen to this. */
  nicheScore: number;
  /** Component parts, exposed so the UI can explain the number. */
  breakdown: {
    trackObscurity: number | null;
    artistObscurity: number | null;
  };
  /** False when no reference data was found; such tracks are excluded from the average. */
  scored: boolean;
};

export type TagCount = { tag: string; count: number; share: number };

/** One playlist as shown in the picker, before anything is analysed. */
export type PlaylistSummary = {
  id: string;
  name: string;
  /** Null when the provider does not report a total up front. */
  trackCount: number | null;
  imageUrl?: string;
  owner?: string;
  provider: Provider;
};

export type AnalysisResult = {
  provider: Provider | "combined";
  generatedAt: string;
  /** Tracks pulled from the library. */
  totalTracks: number;
  /** Tracks we found reference data for. Only these contribute to the score. */
  matchedTracks: number;
  /** 0-100 mean niche score across matched tracks. */
  nicheScore: number;
  /** Where this score sits against the baseline listener distribution. */
  percentile: number;
  verdict: { label: string; blurb: string };
  distribution: { bucket: string; count: number }[];
  medianTrackListeners: number | null;
  medianArtistListeners: number | null;
  /** Share of matched tracks with a niche score above 70. */
  deepCutShare: number;
  /** Share of matched tracks with a niche score below 30. */
  mainstreamShare: number;
  topTags: TagCount[];
  mostNiche: ScoredTrack[];
  mostMainstream: ScoredTrack[];
  /** Artists ranked by obscurity, deduplicated. */
  deepestArtists: { artist: string; listeners: number | null; trackCount: number }[];
  sources: { provider: Provider; trackCount: number; origins: string[] }[];
};
