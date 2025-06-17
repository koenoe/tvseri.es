export function generateTmdbImageUrl(path: string, size = 'original') {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function buildPosterImageUrl(path: string) {
  return generateTmdbImageUrl(path, 'w300_and_h450_bestv2');
}
