import { createHash } from 'node:crypto';
import { isIPv6 } from 'node:net';
import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';

import client from '../client';
import { writeIf } from '../conditional';

/**
 * Link attempts as atomic hourly counters, as the auth server counts wrong
 * sign-in codes, so every Lambda instance sees the same count. One for
 * everyone and one per hashed client address. A slot is reserved before a
 * code is tried, so a parallel burst can't all slip past a read; a right code
 * gives it back, so only wrong codes count.
 */

const WINDOW_MS = 60 * 60 * 1000;

/**
 * Four-digit codes live five minutes: 100 guesses an hour is about 8 in a
 * code's life, about a 0.1% chance per live code. A sprayer can use it up
 * and hold linking back for everyone until the hour turns (accepted).
 */
const MAX_FAILURES_PER_HOUR = 100;

/** One address: room for a viewer's typos, not for a guessing run */
const MAX_ADDRESS_FAILURES_PER_HOUR = 10;

const table = () => Resource.Connections.name;

const windowOf = (now: number) => Math.floor(now / WINDOW_MS);

/** The eight hextets of a valid IPv6 address, a dotted tail as two */
const hextets = (address: string): number[] => {
  const dotted = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(address);
  const plain = dotted
    ? address.replace(
        dotted[0],
        [1, 3]
          .map((at) =>
            ((Number(dotted[at]) << 8) | Number(dotted[at + 1])).toString(16),
          )
          .join(':'),
      )
    : address;
  const [head = '', tail] = plain.split('::');
  const parse = (part: string) =>
    part ? part.split(':').map((hextet) => Number.parseInt(hextet, 16)) : [];
  const front = parse(head);
  const back = parse(tail ?? '');
  return [
    ...front,
    ...Array<number>(8 - front.length - back.length).fill(0),
    ...back,
  ];
};

/**
 * One IPv6 holder usually gets a whole /64, so the per-address limit groups
 * by it; IPv4, mapped into IPv6 or not, stays per address
 */
export const addressGroup = (raw: string): string => {
  // A zone (`%eth0`) names the client's interface, not the client
  const address = raw.trim().toLowerCase().split('%')[0] ?? '';
  if (!isIPv6(address)) {
    return address;
  }
  const all = hextets(address);
  const mapped =
    all.slice(0, 5).every((hextet) => hextet === 0) && all[5] === 0xffff;
  if (mapped) {
    return all
      .slice(6)
      .flatMap((hextet) => [hextet >> 8, hextet & 0xff])
      .join('.');
  }
  return `${all
    .slice(0, 4)
    .map((hextet) => hextet.toString(16))
    .join(':')}::/64`;
};

/**
 * A plain SHA-256, which brute force over IPv4 reverses: acceptable, as the
 * counters die with the hour's TTL and stay in DynamoDB
 */
const addressKey = (address: string) =>
  createHash('sha256')
    .update(addressGroup(address))
    .digest('base64url')
    .slice(0, 22);

type Counter = Readonly<{
  key: Readonly<{ pk: string; sk: string }>;
  max: number;
}>;

/** The address first, so a limited address never takes a global slot */
const countersOf = (address: string | null, now: number): Counter[] => {
  const window = windowOf(now);
  return [
    ...(address
      ? [
          {
            key: {
              pk: `LINKFAIL#ADDR#${addressKey(address)}#${window}`,
              sk: 'LINKFAIL',
            },
            max: MAX_ADDRESS_FAILURES_PER_HOUR,
          },
        ]
      : []),
    {
      key: { pk: `LINKFAIL#ALL#${window}`, sk: 'LINKFAIL' },
      max: MAX_FAILURES_PER_HOUR,
    },
  ];
};

const reserveOne = ({ key, max }: Counter, ttl: number) =>
  writeIf(
    new UpdateItemCommand({
      ConditionExpression: 'attribute_not_exists(#n) OR #n < :max',
      ExpressionAttributeNames: { '#n': 'n', '#ttl': 'ttl' },
      ExpressionAttributeValues: marshall({
        ':max': max,
        ':one': 1,
        ':ttl': ttl,
      }),
      Key: marshall(key),
      TableName: table(),
      UpdateExpression: 'ADD #n :one SET #ttl = :ttl',
    }),
  );

const releaseAll = (counters: ReadonlyArray<Counter>) =>
  Promise.all(
    counters.map(({ key }) =>
      client.send(
        new UpdateItemCommand({
          ExpressionAttributeNames: { '#n': 'n' },
          ExpressionAttributeValues: marshall({ ':minusOne': -1 }),
          Key: marshall(key),
          TableName: table(),
          UpdateExpression: 'ADD #n :minusOne',
        }),
      ),
    ),
  );

export type LinkAttempt = Readonly<{
  /** For a right code: the attempt doesn't count */
  release: () => Promise<unknown>;
}>;

/**
 * Null when a limit is reached: nothing is reserved then, and no code may be
 * tried. The same keys are released, so an hour turning meanwhile can't
 * push a new hour's counter below zero.
 */
export const reserveLinkAttempt = async (
  address: string | null,
  now = Date.now(),
): Promise<LinkAttempt | null> => {
  const ttl = Math.floor(((windowOf(now) + 2) * WINDOW_MS) / 1000);
  const reserved: Counter[] = [];
  for (const counter of countersOf(address, now)) {
    if (!(await reserveOne(counter, ttl))) {
      await releaseAll(reserved);
      return null;
    }
    reserved.push(counter);
  }
  return { release: () => releaseAll(reserved) };
};
