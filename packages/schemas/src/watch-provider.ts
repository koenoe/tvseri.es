import * as v from 'valibot';

import { HexColorSchema } from './hex-color';
import { PositiveIdSchema } from './positive-id';

export const WatchProviderSchema = v.object({
  color: v.optional(v.string()),
  id: v.number(),
  logo: v.string(),
  logoPath: v.string(),
  name: v.string(),
});

export type WatchProvider = v.InferOutput<typeof WatchProviderSchema>;

/** A TMDB image path, e.g. `/abc123.jpg` */
export const TMDB_IMAGE_PATH_REGEX =
  /^\/[A-Za-z0-9_-]+\.(?:jpe?g|png|svg|webp)$/;

/** Most streaming services one user keeps */
export const MAX_WATCH_PROVIDERS = 60;

/**
 * One streaming service as a client sends it. The API builds `logo` from
 * `logoPath` itself, so a `logo` sent along is ignored; stored services are
 * read through this too (one that fails it is left out).
 */
export const WatchProviderInputSchema = v.object({
  color: v.optional(HexColorSchema),
  id: PositiveIdSchema,
  // TMDB lists a few services without a logo
  logoPath: v.union([
    v.literal(''),
    v.pipe(v.string(), v.regex(TMDB_IMAGE_PATH_REGEX)),
  ]),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
});

export type WatchProviderInput = v.InferOutput<typeof WatchProviderInputSchema>;
