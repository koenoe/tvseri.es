import { QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { describe, expect, it } from 'vitest';

import { countQuery } from '@/lib/db/count';
import { queryAll, queryPages } from '@/lib/db/query';

import { db } from './db';

const seedList = (count: number) =>
  db.seed(
    'Lists',
    Array.from({ length: count }, (_, index) => ({
      pk: 'USER#U1',
      sk: `LIST#WATCHLIST#${String(index).padStart(3, '0')}`,
      title: `Show ${index}`,
    })),
  );

const watchlist = {
  ExpressionAttributeValues: marshall({
    ':pk': 'USER#U1',
    ':prefix': 'LIST#WATCHLIST#',
  }),
  KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
  TableName: 'Lists',
};

const sentQueries = () =>
  db.calls.filter((command) => command instanceof QueryCommand);

describe('queryPages / queryAll', () => {
  it('follows every page, one command per page, each with its own start key', async () => {
    seedList(5);

    const items = await queryAll<{ sk: string }>({ ...watchlist, Limit: 2 });

    expect(items.map((item) => item.sk)).toEqual([
      'LIST#WATCHLIST#000',
      'LIST#WATCHLIST#001',
      'LIST#WATCHLIST#002',
      'LIST#WATCHLIST#003',
      'LIST#WATCHLIST#004',
    ]);
    const starts = sentQueries().map(
      (command) => command.input.ExclusiveStartKey?.sk?.S,
    );
    expect(starts).toEqual([
      undefined,
      'LIST#WATCHLIST#001',
      'LIST#WATCHLIST#003',
    ]);
  });

  it('sends one Query when everything fits a page', async () => {
    seedList(3);

    const pages = [];
    for await (const page of queryPages(watchlist)) {
      pages.push(page);
    }

    expect(pages).toHaveLength(1);
    expect(sentQueries()).toHaveLength(1);
  });

  it('counts with Select COUNT', async () => {
    seedList(5);
    expect(await countQuery(watchlist)).toBe(5);
    expect(sentQueries()[0]?.input.Select).toBe('COUNT');
  });
});
