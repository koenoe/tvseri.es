/**
 * An episode's own URL: the show page with its episode open
 * (`/{id}/{slug}?season=N&episode=M`)
 */
export default function episodePath(
  showHref: string,
  season: number,
  episode: number,
): string {
  return `${showHref}?season=${season}&episode=${episode}`;
}
