/// <reference path="../.sst/platform/config.d.ts" />

/**
 * A viewer's linked streaming services. Sign-ins live encrypted apart from the
 * user record so access stays narrow; the key is for nothing else, and every
 * ciphertext carries the user and the service in its encryption context.
 */

export const connections = new sst.aws.Dynamo('Connections', {
  fields: {
    // As apps/api/src/lib/db/connections writes them. Never change these
    // fields to "match" anything: that rebuilds the table.
    // Primary key. Connection items: USER#{userId} / SERVICE#{service}.
    // Link code items: CODE#{code} / CODE.
    // Live code pointer (one per user): USER#{userId} / LINKCODE.
    pk: 'string',
    sk: 'string',

    // Connection data fields:
    // secret: 'string',   the service session, envelope-encrypted
    //                     (v1.<wrapped data key>.<iv>.<tag>.<ciphertext>)
    // profileId: 'string', profileName: 'string',
    // status: 'string', createdAt: 'number', via: 'string',
    // latestTitle, latestEpisodeTitle, latestWatchedAt, total,
    // lastSyncedAt: 'number' (null until the first sync).
    // The sync worker's: sync (the last run: state, runId, chainId, checkpoint,
    // counts; sync.cursor, a cursor-paged history's next page {page, token}),
    // syncedThrough: 'number', recheckedWith: 'number' (the matcher version
    // the open review entries were last re-checked with).
    // Review entries: USER#{userId} / UNRESOLVED#{service}#{id}; resolved
    // or dismissed ones move to USER#{userId} / CLOSED#{service}#{id}; the
    // open count: USER#{userId} / UNRESOLVEDCOUNT#{service}.
    //
    // Link code items: userId: 'string', service: 'string',
    // expiresAt: 'number', ttl: 'number'
    // Live code pointer: code: 'string', expiresAt: 'number', ttl: 'number'
    // Link attempts, per hour (a right code gives its slot back): LINKFAIL#ALL#{hour} / LINKFAIL and
    // LINKFAIL#ADDR#{address hash}#{hour} / LINKFAIL, n: 'number',
    // ttl: 'number'
  },
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk',
  },
  // Link codes, pointers and failed-attempt counters die by TTL; DynamoDB
  // sweeps them within 48h of expiry, so reads check expiresAt (or the
  // hour in the key) themselves
  ttl: 'ttl',
});

/** This SST has no KMS component yet, so the key is native, wrapped to link. */
export const connectionsKmsKey = new aws.kms.Key('ConnectionsKey', {
  deletionWindowInDays: 7,
  description:
    'tvseri.es connections: encrypted streaming-service sign-ins only',
  // A new key version yearly; KMS keeps the old ones, so stored sessions
  // still open
  enableKeyRotation: true,
});

/**
 * The API may only wrap a fresh data key per stored sign-in
 * (lib/connections/crypto.ts). It never reads a session back: only the sync
 * worker has kms:Decrypt (infra/connectionSync.ts).
 */
export const connectionsKey = new sst.Linkable('ConnectionsKey', {
  include: [
    sst.aws.permission({
      actions: ['kms:GenerateDataKey'],
      resources: [connectionsKmsKey.arn],
    }),
  ],
  properties: {
    keyId: connectionsKmsKey.keyId,
  },
});
