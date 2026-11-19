import * as v from 'valibot';

/** A media server account (Plex sends `Account` with every event) */
export type ScrobbleAccount = Readonly<{ id: number; title: string }>;

export type WebhookToken = Readonly<{
  token: string;
  userId: string;
  type: string;
  createdAt: string;
  /** While paused, scrobbles are acknowledged but not marked */
  paused?: boolean;
  /** Only this account's plays count ("Whose plays count"); absent = everyone */
  onlyAccount?: ScrobbleAccount;
  /** The account of the last scrobble received */
  lastAccount?: ScrobbleAccount;
  /** When the last scrobble was received (epoch ms) */
  lastReceivedAt?: number;
  /**
   * When this token's key was last written to the API's edge store (epoch
   * ms), and to which store (its id). Absent on tokens from before the edge
   * check; a row without them, or marked for a replaced store, gets its key
   * on the next status read.
   */
  edgeAt?: number;
  edgeStore?: string;
}>;

/** A watched episode marked by the media server, for "Recent" and the week */
export const RecentScrobbleSchema = v.object({
  episodeNumber: v.number(),
  /** The episode's name, as stored with the mark; absent on older marks */
  episodeTitle: v.optional(v.string()),
  seasonNumber: v.number(),
  seriesId: v.number(),
  title: v.string(),
  watchedAt: v.number(),
});
export type RecentScrobble = Readonly<
  v.InferOutput<typeof RecentScrobbleSchema>
>;

/** `GET /webhook/type/:type/status`; never the token itself */
export type WebhookStatus =
  | Readonly<{ connected: false }>
  | Readonly<{
      connected: true;
      createdAt: string;
      /**
       * Whether the URL passes the edge. False only when the token's key is
       * missing from the edge store and couldn't be written: the URL is
       * refused until the user creates a new one.
       */
      urlWorks: boolean;
      paused: boolean;
      onlyAccount: ScrobbleAccount | null;
      lastAccount: ScrobbleAccount | null;
      lastReceivedAt: number | null;
      /** The latest marks made through this provider, newest first (≤ 5) */
      recent: ReadonlyArray<RecentScrobble>;
      /**
       * Every mark made through this provider in the last 8 days, newest
       * first (≤ 200): the browser buckets them into the viewer's last
       * seven local days
       */
      /** Absent from an API a build behind the web */
      week?: ReadonlyArray<RecentScrobble>;
    }>;

/**
 * `PATCH /webhook/type/:type`: pause, and whose plays count
 * (`onlyAccountId`: the id of the last scrobble's account, or null for
 * everyone).
 */
export const UpdateWebhookSettingsSchema = v.pipe(
  v.strictObject({
    onlyAccountId: v.optional(
      v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
    ),
    paused: v.optional(v.boolean()),
  }),
  v.check(
    (input) => input.paused !== undefined || input.onlyAccountId !== undefined,
    'Nothing to update',
  ),
);

export type UpdateWebhookSettings = v.InferOutput<
  typeof UpdateWebhookSettingsSchema
>;
