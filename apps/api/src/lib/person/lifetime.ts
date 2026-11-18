/**
 * How long a person's stored data lives. Filmographies change slowly, so it
 * is cached aggressively: fresh for 30 days, then served while
 * one Lambda refreshes it (a claim of REFRESH_CLAIM_SECONDS), and kept up to
 * 150 days to stand in when TMDB can't be asked (TMDB's terms allow caching
 * up to 6 months). A person TMDB doesn't know is asked again after a day.
 * The person routes' CDN profile stays `medium` (7 days), as the web's.
 */
export const PERSON_FRESH = 30 * 24 * 60 * 60;
export const PERSON_KEEP = 150 * 24 * 60 * 60;
export const UNKNOWN_PERSON_FRESH = 24 * 60 * 60;
export const REFRESH_CLAIM_SECONDS = 60;
