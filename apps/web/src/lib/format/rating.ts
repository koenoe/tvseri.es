/**
 * The product's one rating format: a 0–10 score to one decimal ("8.6"),
 * drawn after the star (the show page's IMDb badge, the episode modal),
 * never a percentage. Empty for an unrated show (a 0 or none).
 */
export const formatScore = (score: number | null | undefined): string =>
  typeof score === 'number' && score > 0 ? score.toFixed(1) : '';

/** The same score in running text, with its star: "★ 8.6" ('' when unrated). */
export const ratingText = (score: number | null | undefined): string => {
  const value = formatScore(score);
  return value ? `★ ${value}` : '';
};
