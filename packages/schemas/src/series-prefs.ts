import * as v from 'valibot';

const EPISODE_CODE = /^S(\d{1,3})E(\d{1,4})$/i;

/** `S02E05`: season and episode, at least two digits each */
export const toEpisodeCode = (seasonNumber: number, episodeNumber: number) =>
  `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;

/** `S02E05` → season 2, episode 5; null for anything else */
export const parseEpisodeCode = (
  code: string,
): Readonly<{ seasonNumber: number; episodeNumber: number }> | null => {
  const match = EPISODE_CODE.exec(code);
  return match
    ? { episodeNumber: Number(match[2]), seasonNumber: Number(match[1]) }
    : null;
};

/**
 * An episode code, normalised to `S02E05` (accepts `s2e5`, `S002E005`), so
 * one episode always has one code.
 */
export const EpisodeCodeSchema = v.pipe(
  v.string(),
  v.regex(EPISODE_CODE, 'Expected an episode code like S02E05'),
  v.transform((code) => {
    const { episodeNumber, seasonNumber } = parseEpisodeCode(code)!;
    return toEpisodeCode(seasonNumber, episodeNumber);
  }),
);

export type EpisodeCode = v.InferOutput<typeof EpisodeCodeSchema>;

/** Paused shows: Keep asks again only after new watching; Hide hides it */
export const PausedChoiceSchema = v.picklist(['keep', 'hide']);

export type PausedChoice = v.InferOutput<typeof PausedChoiceSchema>;

/** A user's prefs for one show (`GET /me/series/:id/prefs`) */
export type SeriesPrefs = Readonly<{
  /** Skipped episodes: not watched, left out of Next up; sorted */
  skipped: ReadonlyArray<EpisodeCode>;
  /** When the first-tracking prompt was answered (epoch ms) */
  firstTrackingAnsweredAt: number | null;
  /** "Never for this show" on "Mark the N before it too?" */
  neverAskBefore: boolean;
  paused: PausedChoice | null;
  /** When Keep/Hide was chosen (epoch ms) */
  pausedAt: number | null;
}>;

/** List status and prefs in one read (`GET /me/series/:id/status`) */
export type SeriesStatus = Readonly<{
  isFavorited: boolean;
  isWatchlisted: boolean;
  prefs: SeriesPrefs;
}>;

const EpisodeCodesSchema = v.pipe(
  v.array(EpisodeCodeSchema),
  v.minLength(1),
  v.maxLength(2000),
);

/**
 * `PATCH /me/series/:id/prefs`: only the fields sent change. `skip` and
 * `unskip` add to / remove from the skipped set (no lost updates across
 * devices); they can't share a code.
 */
export const UpdateSeriesPrefsSchema = v.pipe(
  v.strictObject({
    firstTrackingAnswered: v.optional(v.boolean()),
    neverAskBefore: v.optional(v.boolean()),
    paused: v.optional(v.nullable(PausedChoiceSchema)),
    skip: v.optional(EpisodeCodesSchema),
    unskip: v.optional(EpisodeCodesSchema),
  }),
  v.check((input) => Object.keys(input).length > 0, 'Nothing to update'),
  v.check(
    (input) => !input.skip?.some((code) => input.unskip?.includes(code)),
    'An episode cannot be skipped and unskipped at once',
  ),
);

export type UpdateSeriesPrefs = v.InferOutput<typeof UpdateSeriesPrefsSchema>;
