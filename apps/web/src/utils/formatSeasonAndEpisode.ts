const formatSeasonAndEpisode = (
  input: Readonly<{
    seasonNumber: number;
    episodeNumber: number;
  }>,
): string => {
  const paddedSeason = input.seasonNumber.toString().padStart(2, '0');
  const paddedEpisode = input.episodeNumber.toString().padStart(2, '0');
  return `S${paddedSeason}E${paddedEpisode}`;
};

export default formatSeasonAndEpisode;
