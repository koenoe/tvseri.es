import * as v from 'valibot';

export const PreferredImagesSchema = v.object({
  backdropColor: v.string(),
  backdropImagePath: v.string(),
  /** `'text'`: the show's name in the display type instead of a logo. */
  titleTreatment: v.optional(v.literal('text')),
  titleTreatmentImagePath: v.optional(v.string()),
});

export type PreferredImages = v.InferOutput<typeof PreferredImagesSchema>;

/** A text-free backdrop on TMDB (`GET /series/:id/images`). */
export type SeriesBackdropImage = Readonly<{ path: string; url: string }>;

/** A logo on TMDB, with its size and language (ISO 639-1, null when none). */
export type SeriesLogoImage = Readonly<{
  height: number;
  language: string | null;
  path: string;
  url: string;
  width: number;
}>;

/**
 * `GET /series/:id/images`: the admin image picker's choices, in TMDB's vote
 * order, the images the show page uses when nothing is saved (`automatic`, the
 * same rule as the series object) and the saved pick (`preferred`).
 */
export type SeriesImages = Readonly<{
  automatic: Readonly<{
    backdropPath: string | null;
    titleTreatmentPath: string | null;
  }>;
  backdrops: ReadonlyArray<SeriesBackdropImage>;
  preferred: PreferredImages | null;
  titleTreatment: ReadonlyArray<SeriesLogoImage>;
}>;

const seriesId = v.pipe(v.number(), v.integer(), v.minValue(1));

/** A TMDB image path, e.g. `/abc123.jpg` (the API's own rule). */
const TmdbImagePathSchema = v.pipe(
  v.string(),
  v.maxLength(100),
  v.regex(/^\/[A-Za-z0-9_-]+\.(?:jpe?g|png|svg|webp)$/),
);

/** The web's admin save: the pick for one show, paths and colour checked. */
export const SavePreferredImagesInputSchema = v.object({
  preferred: v.object({
    backdropColor: v.pipe(v.string(), v.regex(/^#[0-9a-f]{6}$/i)),
    backdropImagePath: TmdbImagePathSchema,
    titleTreatment: v.optional(v.literal('text')),
    titleTreatmentImagePath: v.optional(TmdbImagePathSchema),
  }),
  seriesId,
});

/** The web's admin page-colour lookup: a few backdrops of one show. */
export const BackdropColoursInputSchema = v.object({
  paths: v.pipe(v.array(TmdbImagePathSchema), v.minLength(1), v.maxLength(8)),
  seriesId,
});

/**
 * `PUT|DELETE /admin/preferred-images/series/:id`: the write succeeded. The
 * CDN purge it started may still be running.
 */
export type AdminWriteResult = Readonly<{ message: 'OK' }>;
