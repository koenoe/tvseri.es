/**
 * The API bulkhead: one Hono app deployed as two Lambdas (infra/api.ts).
 *
 * - The **write function** takes the viewer's own writes (marks, favourites,
 *   watchlist, follows, prefs, account, imports, scrobble webhooks) and the
 *   few DynamoDB-only reads that must show those writes at once.
 * - The **catalogue function** (`ApiFunction`, the Router's default route)
 *   takes everything else: every route that can reach TMDB, OMDb or MDBList,
 *   and the heavy own-data reads (overview, stats, export, Home rows).
 *
 * So a slow TMDB that fills the catalogue function's concurrency can't take
 * the capacity marks need. The split is made at the edge (apiEdgeInjection.ts)
 * from the method and path only. Both functions run the whole app, so a
 * request that reaches the "wrong" one is still answered correctly: a routing
 * mistake costs protection, never correctness.
 *
 * Regex sources are strings because the edge function is built from them.
 */
export const API_WRITE_ROUTES = {
  /** No dot segments: those stay on the default route */
  dotSegmentSource: '\\.\\.|%2e',
  /**
   * The KeyValueStore key holding the write function's URL host. The edge
   * only routes to it once the key exists, so a deploy that hasn't written it
   * yet (or a removed key) leaves every request on the catalogue function.
   */
  kvKey: 'api:write-origin',
  /**
   * GET/HEAD: the viewer's own state that reads only DynamoDB and must show a
   * write straight away. `/me`, the library ids, a series' status and prefs,
   * the watched history and its counts, list membership and list counts.
   * Not the list pages (`?include=facts` reads series facts) nor anything
   * else under /me (Home rows, overview, ledger, circle, export).
   */
  ownStateReadSource:
    '^\\/(me(\\/library-ids|\\/series\\/\\d+\\/(status|prefs))?|user\\/[\\w-]+\\/(watched(\\/[\\w/-]*)?|list-status\\/\\d+|list\\/\\w+\\/(count|\\d+)))$',
  /**
   * Any other method (POST, PUT, PATCH, DELETE) under these is a write of the
   * viewer's own state. Writes elsewhere (web-vitals beacons, admin) stay on
   * the catalogue function.
   */
  writePathSource: '^\\/(me|user|webhook|scrobble)(\\/|$)',
} as const;

/**
 * Reserved concurrency per function in production: 200 in all. The model
 * behind the split is in the decisions doc.
 */
export const API_CONCURRENCY = {
  catalogue: 150,
  write: 50,
} as const;
