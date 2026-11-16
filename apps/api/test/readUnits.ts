import {
  type AttributeValue,
  BatchGetItemCommand,
  GetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';

import { db } from './db';

/**
 * What a request reads from DynamoDB, priced as on-demand read request units
 * from the fake's data: a Query is billed on the full size of the items
 * matching its key condition (projection doesn't lower it), rounded up to
 * 4 KB per call; a GetItem / BatchGetItem per item, each rounded up to 4 KB.
 * Eventually consistent = 0.5 RRU per 4 KB, consistent = 1. Item size as
 * DynamoDB counts it: attribute names plus values (numbers about half
 * their digits plus one).
 */

type Raw = Record<string, AttributeValue>;

const valueBytes = (value: AttributeValue): number => {
  if (value.S !== undefined) return Buffer.byteLength(value.S);
  if (value.N !== undefined) return Math.ceil(value.N.length / 2) + 1;
  if (value.BOOL !== undefined || value.NULL !== undefined) return 1;
  if (value.SS)
    return value.SS.reduce((sum, s) => sum + Buffer.byteLength(s), 0);
  if (value.NS) return value.NS.reduce((sum, n) => sum + n.length / 2 + 1, 0);
  if (value.L)
    return 3 + value.L.reduce((sum, v) => sum + 1 + valueBytes(v), 0);
  if (value.M) return 3 + itemBytes(value.M);
  if (value.B) return value.B.length;
  return 0;
};

const itemBytes = (item: Raw): number =>
  Object.entries(item).reduce(
    (sum, [name, value]) => sum + Buffer.byteLength(name) + valueBytes(value),
    0,
  );

const units = (bytes: number, consistent: boolean) =>
  Math.max(1, Math.ceil(bytes / 4096)) * (consistent ? 1 : 0.5);

export type ReadReport = {
  /** Commands sent, by name (`QueryCommand: 3`) */
  commands: Record<string, number>;
  /** Read request units per table */
  rru: Record<string, number>;
  totalRru: number;
  /** Bytes read per table (full items) */
  bytes: Record<string, number>;
};

type Input = Record<string, unknown>;

const withoutProjection = (input: Input): Input => {
  const { ProjectionExpression: _, ...rest } = input;
  return rest;
};

/** Runs `fn` and prices every read command it sent */
export const measureReads = async <T>(
  fn: () => T | Promise<T>,
): Promise<Readonly<{ result: T; report: ReadReport }>> => {
  const from = db.calls.length;
  const result = await fn();
  const sent = db.calls.slice(from);
  const report: ReadReport = { bytes: {}, commands: {}, rru: {}, totalRru: 0 };
  const add = (table: string, bytes: number, rru: number) => {
    report.bytes[table] = (report.bytes[table] ?? 0) + bytes;
    report.rru[table] = (report.rru[table] ?? 0) + rru;
    report.totalRru += rru;
  };

  const mark = db.calls.length;
  for (const command of sent) {
    const name = command.constructor.name;
    report.commands[name] = (report.commands[name] ?? 0) + 1;
    const input = command.input as Input;
    if (command instanceof QueryCommand) {
      const full = (await db.send(
        new QueryCommand(withoutProjection(input) as never),
      )) as { Items?: Raw[] };
      const bytes = (full.Items ?? []).reduce((s, i) => s + itemBytes(i), 0);
      add(
        String(input.TableName),
        bytes,
        units(bytes, input.ConsistentRead === true),
      );
    } else if (command instanceof GetItemCommand) {
      const full = (await db.send(
        new GetItemCommand(withoutProjection(input) as never),
      )) as { Item?: Raw };
      const bytes = full.Item ? itemBytes(full.Item) : 0;
      add(
        String(input.TableName),
        bytes,
        units(bytes, input.ConsistentRead === true),
      );
    } else if (command instanceof BatchGetItemCommand) {
      const requests = input.RequestItems as Record<string, Input>;
      for (const [table, request] of Object.entries(requests)) {
        const full = (await db.send(
          new BatchGetItemCommand({
            RequestItems: { [table]: withoutProjection(request) },
          } as never),
        )) as { Responses?: Record<string, Raw[]> };
        for (const item of full.Responses?.[table] ?? []) {
          const bytes = itemBytes(item);
          add(table, bytes, units(bytes, false));
        }
      }
    }
  }
  // the pricing reads are not the request's
  db.calls.splice(mark);
  return { report, result };
};
