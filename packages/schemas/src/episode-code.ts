const pad = (n: number) => String(n).padStart(2, '0');

/**
 * "S03E05": the one episode code, everywhere: the key an episode is stored
 * under (watched records, skipped episodes, ledgers) and the label the web
 * UI, toasts, aria labels and the API's log lines show. Zero-padded to two
 * digits, longer numbers kept whole (`S12E104`). A text that writes it in
 * full says "Season 3, Episode 5". Stored keys depend on this exact format.
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

/** What `EpisodeCodeSchema` accepts: `S02E05`, `s2e5`, `S002E005` */
export const EPISODE_CODE_PATTERN = /^S(\d{1,3})E(\d{1,4})$/i;

/** `S02E05` → season 2, episode 5; null for anything else */
export const parseEpisodeCode = (
  code: string,
): Readonly<{ seasonNumber: number; episodeNumber: number }> | null => {
  const match = EPISODE_CODE_PATTERN.exec(code);
  return match
    ? { episodeNumber: Number(match[2]), seasonNumber: Number(match[1]) }
    : null;
};
