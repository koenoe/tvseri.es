import * as v from 'valibot';

/** `GET /user/:id/stats/zone`: the zone the user's stats count in */
export const StatsZoneSchema = v.object({
  /** IANA, as `/user/:id/stats/years` names it */
  timeZone: v.string(),
});

/** `GET /user/:id/stats/zone` */
export type StatsZone = v.InferOutput<typeof StatsZoneSchema>;
