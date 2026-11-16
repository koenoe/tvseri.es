const pad = (n: number) => String(n).padStart(2, '0');

/**
 * "S03E05": the one episode code, everywhere (web UI, toasts, aria labels,
 * the API's log lines), zero-padded; a text that writes it in full says
 * "Season 3, Episode 5".
 */
export const episodeCode = (
  ref: Readonly<{ episodeNumber: number; seasonNumber: number }>,
) => `S${pad(ref.seasonNumber)}E${pad(ref.episodeNumber)}`;

/**
 * "E05": an episode inside a season's own list or line, where the season is
 * clear from the context. Same zero-padding as `episodeCode`.
 */
export const shortCode = (episodeNumber: number) => `E${pad(episodeNumber)}`;

/**
 * "S03": a season named in a line ("Watching S03", "S04 renewed"). Same
 * zero-padding as `episodeCode`.
 */
export const seasonCode = (seasonNumber: number) => `S${pad(seasonNumber)}`;
