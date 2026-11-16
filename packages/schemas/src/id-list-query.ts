import * as v from 'valibot';

/**
 * A `?ids=3,1,2` query value: positive integer ids of up to 10 digits (TMDB
 * ids), comma-separated, duplicates collapsed, at most `max` distinct ids.
 * Output: the ids as numbers, in the order first sent.
 */
export const idListSchema = (max: number) =>
  v.pipe(
    v.string(),
    v.regex(
      /^[1-9]\d{0,9}(?:,[1-9]\d{0,9})*$/,
      'Expected a comma-separated list of ids',
    ),
    v.transform((value) => [...new Set(value.split(',').map(Number))]),
    v.maxLength(max, `At most ${max} ids`),
  );
