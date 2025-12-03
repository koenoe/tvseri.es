import generateTmdbImageUrl from './generateTmdbImageUrl';

export function buildPosterImageUrl(path: string, size?: string) {
  return generateTmdbImageUrl(path, size ?? 'w300_and_h450_bestv2');
}

export function buildBackdropImageUrl(path: string, size?: string) {
  return generateTmdbImageUrl(path, size ?? 'w1920_and_h1080_multi_faces');
}

export function buildTitleTreatmentImageUrl(path: string, size?: string) {
  return generateTmdbImageUrl(path, size ?? 'w500');
}

export function buildLogoImageUrl(path: string, size?: string) {
  return generateTmdbImageUrl(path, size ?? 'w92');
}

export function buildProfileImageUrl(path: string, size?: string) {
  return generateTmdbImageUrl(path, size ?? 'w600_and_h900_bestv2');
}

export function buildStillImageUrl(path: string, size?: string) {
  return generateTmdbImageUrl(path, size ?? 'w454_and_h254_bestv2');
}
