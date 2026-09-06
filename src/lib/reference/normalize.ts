/**
 * Streaming catalogues decorate titles in ways the reference corpora do not:
 * "Weird Fishes / Arpeggi - 2016 Remaster", "Song (feat. Someone)",
 * "Track - From \"The Movie\"". Searching those verbatim misses a lot of real
 * matches, so we strip the decoration before looking anything up.
 */

const TRAILING_QUALIFIER =
  /\s+-\s+(remaster(ed)?|.*\bremaster(ed)?\b|.*\bversion\b|.*\bmix\b|.*\bedit\b|.*\bmono\b|.*\bstereo\b|.*\blive\b|.*\bdemo\b|.*\bradio\b|from\s+.*|bonus track.*)\s*$/i;

const BRACKETED_QUALIFIER =
  /\s*[([]\s*(feat\.?|ft\.?|featuring|with)\s[^)\]]*[)\]]/gi;

const BRACKETED_VERSION =
  /\s*[([][^)\]]*\b(remaster(ed)?|deluxe|bonus|mono|stereo|anniversary|expanded|re-?recorded|taylor's version)\b[^)\]]*[)\]]/gi;

/** Cleans a track title for lookup. Keeps remixes — a remix is a different recording. */
export function normalizeTitle(title: string): string {
  let out = title;
  out = out.replace(BRACKETED_QUALIFIER, "");
  out = out.replace(BRACKETED_VERSION, "");
  out = out.replace(TRAILING_QUALIFIER, "");
  out = out.replace(/\s+/g, " ").trim();
  return out.length > 0 ? out : title.trim();
}

/**
 * Reduces an artist credit to the primary act. Reference corpora index
 * "Artist A" separately from "Artist A, Artist B", and the primary act is the
 * better signal for how well-known the music is.
 */
export function normalizeArtist(artist: string): string {
  const primary = artist.split(/\s*(?:,|&|feat\.?|ft\.?|featuring|with|x|vs\.?)\s+/i)[0];
  return primary.replace(/\s+/g, " ").trim() || artist.trim();
}

/** Key used to deduplicate a library across playlists and providers. */
export function trackKey(artist: string, title: string): string {
  return `${normalizeArtist(artist).toLowerCase()}::${normalizeTitle(title).toLowerCase()}`;
}
