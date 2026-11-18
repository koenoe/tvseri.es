/**
 * Production's progressive blur: eased mask stops, so the blur fades in with
 * no visible edge and busy art turns into soft colour where text sits on it.
 * The page backdrop's bottom fade carries it (every width), and so does the
 * phone show hero's own backdrop.
 */
const BLUR_MASK =
  'linear-gradient(to bottom, transparent, rgba(0,0,0,0.068) 3.3%, rgba(0,0,0,0.145) 5.9%, rgba(0,0,0,0.227) 8.1%, rgba(0,0,0,0.313) 10.1%, rgba(0,0,0,0.401) 12.1%, rgba(0,0,0,0.49) 14.6%, rgba(0,0,0,0.578) 17.7%, rgba(0,0,0,0.661) 21.8%, rgba(0,0,0,0.74) 27.1%, rgba(0,0,0,0.812) 33.9%, rgba(0,0,0,0.875) 42.4%, rgba(0,0,0,0.927) 53%, rgba(0,0,0,0.966) 66%, rgba(0,0,0,0.991) 81.5%, rgba(0,0,0,0.991) 100%)';
const BLUR_FILTER = 'saturate(120%) blur(60px)';

export const PROGRESSIVE_BLUR = {
  backdropFilter: BLUR_FILTER,
  maskImage: BLUR_MASK,
  WebkitBackdropFilter: BLUR_FILTER,
  WebkitMaskImage: BLUR_MASK,
} as const;
