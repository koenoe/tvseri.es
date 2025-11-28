import generateTmdbImageUrl from './generateTmdbImageUrl';

export default function buildPosterImageUrl(path: string) {
  return generateTmdbImageUrl(path, 'w300_and_h450_bestv2');
}
