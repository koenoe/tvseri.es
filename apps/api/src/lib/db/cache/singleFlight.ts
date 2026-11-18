import {
  ConditionalCheckFailedException,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';

import client from '../client';

import { getCacheEntry } from './index';

/**
 * Single-flight across Lambda instances: a claim is one small Cache-table
 * item (`CACHE#claim:<key>`) that says "someone is on this" until it lapses.
 *
 * - `claim(key, seconds)` is one conditional PutItem: it succeeds for exactly
 *   one caller while no live claim exists (none, or its `expiresAt` has
 *   passed: DynamoDB's TTL sweep lags, so the condition checks the time, not
 *   only existence). Losers get `false` without a write of their own beyond
 *   the failed condition (which DynamoDB still bills as one write).
 * - A claim is never released: it lapses after `seconds`. Whoever won and
 *   finished has stored its result, so a lingering claim costs nothing; a
 *   winner that failed or timed out leaves the claim to lapse, which is the
 *   backoff everyone else needs anyway.
 * - `readClaim(key)` returns a live claim's value (e.g. the circuit breaker's
 *   `openUntil`), else undefined: one eventually consistent GetItem.
 *
 * Used for "one build or refresh in flight" (readThroughDay.ts,
 * readThroughStale.ts, lib/seriesFacts, lib/mdblist) and the circuit
 * breaker's shared open state (lib/upstream/breaker.ts). Errors other than
 * a lost condition are thrown: the caller decides whether to proceed
 * without the claim.
 */

const claimKey = (key: string) => `claim:${key}`;

const nowInSeconds = () => Math.floor(Date.now() / 1000);

/** One caller wins `key` for `seconds`; true when it is this one */
export const claim = async (
  key: string,
  seconds: number,
  value: unknown = null,
): Promise<boolean> => {
  const now = nowInSeconds();
  try {
    await client.send(
      new PutItemCommand({
        ConditionExpression: 'attribute_not_exists(pk) OR expiresAt <= :now',
        ExpressionAttributeValues: marshall({ ':now': now }),
        Item: marshall({
          createdAt: new Date().toISOString(),
          expiresAt: now + Math.max(1, Math.ceil(seconds)),
          pk: `CACHE#${claimKey(key)}`,
          value: JSON.stringify(value),
        }),
        TableName: Resource.Cache.name,
      }),
    );
    return true;
  } catch (error) {
    if (
      error instanceof ConditionalCheckFailedException ||
      (error instanceof Error &&
        error.name === 'ConditionalCheckFailedException')
    ) {
      return false;
    }
    throw new Error(`Failed to claim ${key}`, { cause: error });
  }
};

/** A live claim's value, or undefined when there is none */
export const readClaim = async <T>(key: string): Promise<T | undefined> => {
  const entry = await getCacheEntry<T>(claimKey(key));
  return entry && !entry.expired ? (entry.value ?? undefined) : undefined;
};
