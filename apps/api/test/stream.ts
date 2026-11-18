import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';

import { handler } from '@/lambdas/watched';
import { db } from './db';

type Item = Record<string, unknown>;

const keyOf = (item: Item) => `${String(item.pk)}|${String(item.sk)}`;

const snapshot = () =>
  new Map(db.dump('Watched').map((item) => [keyOf(item), item]));

/**
 * The stream records DynamoDB would emit for the Watched table going from
 * `before` to its current state (NEW_AND_OLD_IMAGES, one record per item).
 */
const diffRecords = (before: ReadonlyMap<string, Item>) => {
  const after = snapshot();
  const records: DynamoDBRecord[] = [];
  for (const [key, item] of after) {
    const old = before.get(key);
    if (!old) {
      records.push({
        dynamodb: { NewImage: marshall(item) as never },
        eventName: 'INSERT',
      });
    } else if (JSON.stringify(old) !== JSON.stringify(item)) {
      records.push({
        dynamodb: {
          NewImage: marshall(item) as never,
          OldImage: marshall(old) as never,
        },
        eventName: 'MODIFY',
      });
    }
  }
  for (const [key, item] of before) {
    if (!after.has(key)) {
      records.push({
        dynamodb: { OldImage: marshall(item) as never },
        eventName: 'REMOVE',
      });
    }
  }
  return records;
};

export const streamEvent = (
  records: ReadonlyArray<DynamoDBRecord>,
): DynamoDBStreamEvent => ({ Records: [...records] });

/**
 * Runs `change` (API calls, a queue Lambda...) and returns the stream records
 * its Watched writes produce, without delivering them.
 */
export const recordWrites = async (change: () => Promise<unknown>) => {
  const before = snapshot();
  await change();
  return diffRecords(before);
};

/** Runs `change`, then delivers its stream records to the subscriber */
export const withStream = async (change: () => Promise<unknown>) => {
  const records = await recordWrites(change);
  await handler(streamEvent(records));
  return records;
};

/** The user's list items in the Lists table (not the watch calendar's) */
export const listItems = (userId: string) =>
  db
    .dump('Lists')
    .filter(
      (item) =>
        item.pk === `USER#${userId}` && !String(item.sk).startsWith('AGG#'),
    )
    .sort((a, b) => String(a.sk).localeCompare(String(b.sk)));
