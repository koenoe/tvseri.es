import * as v from 'valibot';

/** A TMDB id (a show, a service) or any other id that counts from 1 */
export const PositiveIdSchema = v.pipe(v.number(), v.integer(), v.minValue(1));
