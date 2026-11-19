import { randomBytes } from 'node:crypto';
import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  type ConnectionService,
  ConnectionServiceSchema,
  type LinkCode,
} from '@tvseri.es/schemas';
import { Resource } from 'sst';
import * as v from 'valibot';

import client from '../client';
import { isConditionFailure, writeIf } from '../conditional';
import { connectionsPk } from './keys';

/**
 * Link codes: minted on the service's card, handed back by the extension with
 * the session. Five minutes, single use, bound to viewer and service, one
 * live per viewer.
 */

const table = () => Resource.Connections.name;

const codeKeyPlain = (code: string) => ({ pk: `CODE#${code}`, sk: 'CODE' });
const codeKey = (code: string) => marshall(codeKeyPlain(code));
const pointerKeyPlain = (userId: string) => ({
  pk: connectionsPk(userId),
  sk: 'LINKCODE',
});
const pointerKey = (userId: string) => marshall(pointerKeyPlain(userId));

const CodeItemSchema = v.object({ expiresAt: v.number(), userId: v.string() });
const PointerItemSchema = v.object({ code: v.string() });

/** Small on purpose (typed by hand), hence single use and rate-limited (./linkAttempts.ts) */
const generateCode = () =>
  String(randomBytes(2).readUInt16BE(0) % 10_000).padStart(4, '0');

const CODE_MS = 5 * 60 * 1000;
const MINT_ATTEMPTS = 5;

/** Deletes a code only while it is still this user's (never a reissued one) */
const deleteOwnCode = (code: string, userId: string) =>
  writeIf(
    new DeleteItemCommand({
      ConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: marshall({ ':userId': userId }),
      Key: codeKey(code),
      TableName: table(),
    }),
  );

/** Claims a free code (or an expired one TTL hasn't swept yet) */
const claimCode = async (
  userId: string,
  service: ConnectionService,
  now: number,
  expiresAt: number,
) => {
  for (let attempt = 1; ; attempt += 1) {
    const code = generateCode();
    try {
      await client.send(
        new PutItemCommand({
          ConditionExpression: 'attribute_not_exists(pk) OR expiresAt <= :now',
          ExpressionAttributeValues: marshall({ ':now': now }),
          Item: marshall({
            expiresAt,
            ...codeKeyPlain(code),
            service,
            ttl: Math.floor(expiresAt / 1000),
            userId,
          }),
          TableName: table(),
        }),
      );
      return code;
    } catch (error) {
      if (!isConditionFailure(error) || attempt === MINT_ATTEMPTS) {
        throw error;
      }
    }
  }
};

/** The pointer swap returns the previous code, which is revoked, so a viewer holds one */
export const mintLinkCode = async (
  userId: string,
  service: ConnectionService,
  now = Date.now(),
): Promise<LinkCode> => {
  const expiresAt = now + CODE_MS;
  const code = await claimCode(userId, service, now, expiresAt);
  const { Attributes } = await client.send(
    new PutItemCommand({
      Item: marshall({
        ...pointerKeyPlain(userId),
        code,
        expiresAt,
        ttl: Math.floor(expiresAt / 1000),
      }),
      ReturnValues: 'ALL_OLD',
      TableName: table(),
    }),
  );
  const previous = v.safeParse(
    PointerItemSchema,
    Attributes ? unmarshall(Attributes) : null,
  );
  if (previous.success && previous.output.code !== code) {
    await deleteOwnCode(previous.output.code, userId);
  }
  return { code, expiresAt };
};

export const revokeLinkCode = async (userId: string): Promise<void> => {
  const { Attributes } = await client.send(
    new DeleteItemCommand({
      Key: pointerKey(userId),
      ReturnValues: 'ALL_OLD',
      TableName: table(),
    }),
  );
  const pointer = v.safeParse(
    PointerItemSchema,
    Attributes ? unmarshall(Attributes) : null,
  );
  if (pointer.success) {
    await deleteOwnCode(pointer.output.code, userId);
  }
};

/**
 * One conditional delete, so two simultaneous uses can't both win. Another
 * service's code is refused unspent, as an unknown code: nothing to probe.
 */
export const consumeLinkCode = async (
  code: string,
  service: ConnectionService,
  now = Date.now(),
): Promise<string | null> => {
  let attributes: Record<string, unknown> | null;
  try {
    const { Attributes } = await client.send(
      new DeleteItemCommand({
        ConditionExpression:
          'attribute_exists(pk) AND expiresAt > :now AND service = :service',
        ExpressionAttributeValues: marshall({
          ':now': now,
          ':service': service,
        }),
        Key: codeKey(code),
        ReturnValues: 'ALL_OLD',
        TableName: table(),
      }),
    );
    attributes = Attributes ? unmarshall(Attributes) : null;
  } catch (error) {
    if (isConditionFailure(error)) {
      return null;
    }
    throw error;
  }
  const item = v.safeParse(CodeItemSchema, attributes);
  if (!item.success) {
    return null;
  }
  const { userId } = item.output;
  // The pointer goes too, unless a newer code already replaced it
  await writeIf(
    new DeleteItemCommand({
      ConditionExpression: 'code = :code',
      ExpressionAttributeValues: marshall({ ':code': code }),
      Key: pointerKey(userId),
      TableName: table(),
    }),
  );
  return userId;
};

const LiveCodeItemSchema = v.object({
  ...CodeItemSchema.entries,
  service: ConnectionServiceSchema,
});

/**
 * For the consent screen, without spending the code. Read consistently; the
 * same refusals as consumeLinkCode.
 */
export const peekLinkCode = async (
  code: string,
  service: ConnectionService,
  now = Date.now(),
): Promise<string | null> => {
  const { Item } = await client.send(
    new GetItemCommand({
      ConsistentRead: true,
      Key: codeKey(code),
      TableName: table(),
    }),
  );
  const item = v.safeParse(LiveCodeItemSchema, Item ? unmarshall(Item) : null);
  return item.success &&
    item.output.expiresAt > now &&
    item.output.service === service
    ? item.output.userId
    : null;
};
