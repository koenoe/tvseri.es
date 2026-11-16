import * as v from 'valibot';

export type JellyfinMetadata = unknown;

const whole = v.pipe(v.number(), v.integer(), v.minValue(0));

/**
 * What the scrobble Lambda reads from a Plex episode's `Metadata`: the
 * route validates the webhook's with it and queues only these fields (the
 * rest of Plex's metadata is not ours to keep), and the Lambda checks a
 * queued message with it again. The numbers go into TMDB URLs. All
 * optional: an episode Plex couldn't number may still be found by its ids.
 */
export const PlexMetadataSchema = v.object({
  /** `imdb://tt…`, `tmdb://…`, `tvdb://…` */
  Guid: v.optional(
    v.pipe(
      v.array(v.object({ id: v.pipe(v.string(), v.maxLength(200)) })),
      v.maxLength(20),
    ),
  ),
  /** The show's title */
  grandparentTitle: v.optional(v.pipe(v.string(), v.maxLength(500))),
  /** The episode number */
  index: v.optional(whole),
  /** The season number */
  parentIndex: v.optional(whole),
  year: v.optional(whole),
});

export type PlexMetadata = v.InferOutput<typeof PlexMetadataSchema>;

export type ScrobbleMetadata =
  | { plex: PlexMetadata; jellyfin?: never }
  | { plex?: never; jellyfin: JellyfinMetadata };

export type ScrobbleEvent = Readonly<{
  userId: string;
  metadata: ScrobbleMetadata;
}>;
