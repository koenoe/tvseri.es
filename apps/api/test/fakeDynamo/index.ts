import {
  type AttributeValue,
  ConditionalCheckFailedException,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import {
  applyProjection,
  applyUpdate,
  evaluateCondition,
  type Item,
} from './expressions';

/**
 * An in-memory DynamoDB test double at the client boundary: it implements
 * `send()` for the commands the API uses, with real key, index, expression,
 * pagination and condition semantics. Tables mirror infra/dynamo/*.ts keys.
 */

type IndexSchema = Readonly<{ hashKey: string; rangeKey?: string }>;

export type TableSchema = IndexSchema &
  Readonly<{ globalIndexes?: Readonly<Record<string, IndexSchema>> }>;

type Raw = Record<string, AttributeValue>;
type Names = Record<string, string> | undefined;

type Command = Readonly<{
  constructor: { name: string };
  input: object;
}>;

const toPlain = (raw: Raw | undefined): Item | undefined =>
  raw ? (unmarshall(raw) as Item) : undefined;

const toRaw = (item: Item): Raw =>
  marshall(item, { removeUndefinedValues: true }) as Raw;

const toValues = (raw: unknown) =>
  raw ? (unmarshall(raw as Raw) as Record<string, unknown>) : undefined;

const conditionFailed = () =>
  new ConditionalCheckFailedException({
    $metadata: {},
    message: 'The conditional request failed',
  });

const compareKeys = (a: unknown, b: unknown) =>
  a === b ? 0 : (a as string | number) < (b as string | number) ? -1 : 1;

class FakeTable {
  readonly items = new Map<string, Item>();

  constructor(readonly schema: TableSchema) {}

  keyOf(item: Item) {
    const { hashKey, rangeKey } = this.schema;
    return rangeKey
      ? { [hashKey]: item[hashKey], [rangeKey]: item[rangeKey] }
      : { [hashKey]: item[hashKey] };
  }

  id(key: Item) {
    const { hashKey, rangeKey } = this.schema;
    if (
      key[hashKey] === undefined ||
      (rangeKey && key[rangeKey] === undefined)
    ) {
      throw new Error('ValidationException: missing key attribute');
    }
    return JSON.stringify([key[hashKey], rangeKey ? key[rangeKey] : null]);
  }

  get(key: Item) {
    return this.items.get(this.id(key));
  }

  put(item: Item) {
    this.items.set(this.id(item), structuredClone(item));
  }

  delete(key: Item) {
    this.items.delete(this.id(key));
  }
}

export class FakeDynamo {
  private readonly tables = new Map<string, FakeTable>();
  /** Every command sent, for tests that assert on access patterns */
  readonly calls: Command[] = [];

  constructor(schemas: Readonly<Record<string, TableSchema>>) {
    for (const [name, schema] of Object.entries(schemas)) {
      this.tables.set(name, new FakeTable(schema));
    }
  }

  reset() {
    for (const table of this.tables.values()) {
      table.items.clear();
    }
    this.calls.length = 0;
  }

  table(name: string) {
    const table = this.tables.get(name);
    if (!table) {
      throw new Error(`ResourceNotFoundException: ${name}`);
    }
    return table;
  }

  /** Seeds items directly (plain objects) */
  seed(tableName: string, items: ReadonlyArray<Item>) {
    for (const item of items) {
      this.table(tableName).put(item);
    }
  }

  /** All items of a table (plain objects), for test assertions */
  dump(tableName: string): Item[] {
    return [...this.table(tableName).items.values()].map((item) =>
      structuredClone(item),
    );
  }

  async send(command: Command): Promise<unknown> {
    this.calls.push(command);
    const input = command.input as Record<string, unknown>;
    switch (command.constructor.name) {
      case 'GetItemCommand':
        return this.getItem(input);
      case 'PutItemCommand':
        return this.putItem(input);
      case 'DeleteItemCommand':
        return this.deleteItem(input);
      case 'UpdateItemCommand':
        return this.updateItem(input);
      case 'QueryCommand':
        return this.query(input, false);
      case 'ScanCommand':
        return this.query(input, true);
      case 'BatchGetItemCommand':
        return this.batchGet(input);
      case 'BatchWriteItemCommand':
        return this.batchWrite(input);
      case 'TransactWriteItemsCommand':
        return this.transactWrite(input);
      default:
        throw new Error(`FakeDynamo: unsupported ${command.constructor.name}`);
    }
  }

  private check(
    condition: unknown,
    item: Item | undefined,
    input: Record<string, unknown>,
  ) {
    if (!condition) {
      return;
    }
    const passed = evaluateCondition(
      condition as string,
      item ?? {},
      input.ExpressionAttributeNames as Names,
      toValues(input.ExpressionAttributeValues),
    );
    if (!passed) {
      throw conditionFailed();
    }
  }

  private getItem(input: Record<string, unknown>) {
    const table = this.table(input.TableName as string);
    const item = table.get(toPlain(input.Key as Raw)!);
    if (!item) {
      return {};
    }
    const projected = applyProjection(
      input.ProjectionExpression as string | undefined,
      item,
      input.ExpressionAttributeNames as Names,
    );
    return { Item: toRaw(projected) };
  }

  private putItem(input: Record<string, unknown>) {
    const table = this.table(input.TableName as string);
    const item = toPlain(input.Item as Raw)!;
    const existing = table.get(item);
    this.check(input.ConditionExpression, existing, input);
    table.put(item);
    return input.ReturnValues === 'ALL_OLD' && existing
      ? { Attributes: toRaw(existing) }
      : {};
  }

  private deleteItem(input: Record<string, unknown>) {
    const table = this.table(input.TableName as string);
    const key = toPlain(input.Key as Raw)!;
    const existing = table.get(key);
    this.check(input.ConditionExpression, existing, input);
    table.delete(key);
    return input.ReturnValues === 'ALL_OLD' && existing
      ? { Attributes: toRaw(existing) }
      : {};
  }

  private updateItem(input: Record<string, unknown>) {
    const table = this.table(input.TableName as string);
    const key = toPlain(input.Key as Raw)!;
    const existing = table.get(key);
    this.check(input.ConditionExpression, existing, input);
    const updated = input.UpdateExpression
      ? applyUpdate(
          input.UpdateExpression as string,
          existing ?? key,
          input.ExpressionAttributeNames as Names,
          toValues(input.ExpressionAttributeValues),
        )
      : (existing ?? key);
    table.put({ ...updated, ...key });
    const returnValues = input.ReturnValues as string | undefined;
    if (returnValues === 'ALL_NEW' || returnValues === 'UPDATED_NEW') {
      return { Attributes: toRaw(updated) };
    }
    if (returnValues === 'ALL_OLD' && existing) {
      return { Attributes: toRaw(existing) };
    }
    return {};
  }

  private query(input: Record<string, unknown>, isScan: boolean) {
    const table = this.table(input.TableName as string);
    const indexName = input.IndexName as string | undefined;
    const index: IndexSchema = indexName
      ? (table.schema.globalIndexes?.[indexName] ??
        (() => {
          throw new Error(`ValidationException: no index ${indexName}`);
        })())
      : table.schema;
    const names = input.ExpressionAttributeNames as Names;
    const values = toValues(input.ExpressionAttributeValues);

    // Sparse indexes: only items with the index keys
    let items = [...table.items.values()].filter(
      (item) =>
        item[index.hashKey] !== undefined &&
        (!index.rangeKey || item[index.rangeKey] !== undefined),
    );

    if (!isScan) {
      items = items.filter((item) =>
        evaluateCondition(
          input.KeyConditionExpression as string,
          item,
          names,
          values,
        ),
      );
    }

    const tableKeys = [table.schema.hashKey, table.schema.rangeKey].filter(
      (key): key is string => Boolean(key),
    );
    const direction = input.ScanIndexForward === false ? -1 : 1;
    const order = (a: Item, b: Item) => {
      const byRange = index.rangeKey
        ? compareKeys(a[index.rangeKey], b[index.rangeKey])
        : 0;
      if (byRange !== 0) {
        return direction * byRange;
      }
      for (const key of tableKeys) {
        const byKey = compareKeys(a[key], b[key]);
        if (byKey !== 0) {
          return direction * byKey;
        }
      }
      return 0;
    };
    items.sort(order);

    const keyAttributes = [
      ...new Set([...tableKeys, index.hashKey, index.rangeKey]),
    ].filter((key): key is string => Boolean(key));
    const keyOf = (item: Item) =>
      Object.fromEntries(keyAttributes.map((key) => [key, item[key]]));

    // A start key is a position: its item may be gone, as in DynamoDB
    const start = toPlain(input.ExclusiveStartKey as Raw | undefined);
    if (start) {
      items = items.filter((item) => order(item, start) > 0);
    }

    const limit = input.Limit as number | undefined;
    const evaluated = limit === undefined ? items : items.slice(0, limit);
    const hasMore = limit !== undefined && items.length > limit;

    const filtered = input.FilterExpression
      ? evaluated.filter((item) =>
          evaluateCondition(
            input.FilterExpression as string,
            item,
            names,
            values,
          ),
        )
      : evaluated;

    const lastEvaluatedKey =
      hasMore && evaluated.length > 0
        ? toRaw(keyOf(evaluated.at(-1)!))
        : undefined;

    if (input.Select === 'COUNT') {
      return {
        Count: filtered.length,
        LastEvaluatedKey: lastEvaluatedKey,
        ScannedCount: evaluated.length,
      };
    }

    return {
      Count: filtered.length,
      Items: filtered.map((item) =>
        toRaw(
          applyProjection(
            input.ProjectionExpression as string | undefined,
            item,
            names,
          ),
        ),
      ),
      LastEvaluatedKey: lastEvaluatedKey,
      ScannedCount: evaluated.length,
    };
  }

  private batchGet(input: Record<string, unknown>) {
    const requests = input.RequestItems as Record<
      string,
      Readonly<{
        Keys: Raw[];
        ProjectionExpression?: string;
        ExpressionAttributeNames?: Record<string, string>;
      }>
    >;
    const responses: Record<string, Raw[]> = {};
    for (const [tableName, request] of Object.entries(requests)) {
      if (request.Keys.length > 100) {
        throw new Error('ValidationException: too many keys');
      }
      const table = this.table(tableName);
      responses[tableName] = request.Keys.flatMap((key) => {
        const item = table.get(toPlain(key)!);
        return item
          ? [
              toRaw(
                applyProjection(
                  request.ProjectionExpression,
                  item,
                  request.ExpressionAttributeNames,
                ),
              ),
            ]
          : [];
      });
    }
    return { Responses: responses, UnprocessedKeys: {} };
  }

  private batchWrite(input: Record<string, unknown>) {
    const requests = input.RequestItems as Record<
      string,
      ReadonlyArray<
        Readonly<{
          PutRequest?: { Item: Raw };
          DeleteRequest?: { Key: Raw };
        }>
      >
    >;
    for (const [tableName, writes] of Object.entries(requests)) {
      if (writes.length > 25) {
        throw new Error('ValidationException: too many items in a batch');
      }
      const table = this.table(tableName);
      const ids = writes.map((write) =>
        table.id(toPlain(write.PutRequest?.Item ?? write.DeleteRequest?.Key)!),
      );
      if (new Set(ids).size !== ids.length) {
        throw new Error('ValidationException: duplicate keys in a batch');
      }
      for (const write of writes) {
        if (write.PutRequest) {
          table.put(toPlain(write.PutRequest.Item)!);
        } else if (write.DeleteRequest) {
          table.delete(toPlain(write.DeleteRequest.Key)!);
        }
      }
    }
    return { UnprocessedItems: {} };
  }

  private transactWrite(input: Record<string, unknown>) {
    const items = input.TransactItems as ReadonlyArray<
      Record<string, Record<string, unknown>>
    >;
    // DynamoDB's own refusals, before any condition is read
    if (items.length > 100) {
      throw new Error('ValidationException: too many items in a transaction');
    }
    const targets = items.map((entry) => {
      const [kind, operation] = Object.entries(entry)[0]!;
      const table = this.table(operation.TableName as string);
      const key =
        kind === 'Put'
          ? table.keyOf(toPlain(operation.Item as Raw)!)
          : toPlain(operation.Key as Raw)!;
      return `${operation.TableName as string}|${table.id(key)}`;
    });
    if (new Set(targets).size !== targets.length) {
      throw new Error(
        'ValidationException: Transaction request cannot include multiple operations on one item',
      );
    }
    // Check every condition first: all or nothing
    const reasons = items.map((entry) => {
      const [kind, operation] = Object.entries(entry)[0]!;
      const table = this.table(operation.TableName as string);
      const key =
        kind === 'Put'
          ? table.keyOf(toPlain(operation.Item as Raw)!)
          : toPlain(operation.Key as Raw)!;
      const existing = table.get(key);
      try {
        this.check(operation.ConditionExpression, existing, operation);
        return { Code: 'None' };
      } catch {
        return {
          Code: 'ConditionalCheckFailed',
          ...(operation.ReturnValuesOnConditionCheckFailure === 'ALL_OLD' &&
            existing && { Item: marshall(existing) }),
        };
      }
    });
    if (reasons.some((reason) => reason.Code !== 'None')) {
      throw new TransactionCanceledException({
        $metadata: {},
        CancellationReasons: reasons,
        message: 'Transaction cancelled',
      });
    }
    for (const entry of items) {
      const [kind, operation] = Object.entries(entry)[0]!;
      const withoutCondition = { ...operation, ConditionExpression: undefined };
      if (kind === 'Put') {
        this.putItem(withoutCondition);
      } else if (kind === 'Delete') {
        this.deleteItem(withoutCondition);
      } else if (kind === 'Update') {
        this.updateItem(withoutCondition);
      }
    }
    return {};
  }
}
