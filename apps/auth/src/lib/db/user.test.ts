import {
  GetItemCommand,
  QueryCommand,
  TransactionCanceledException,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { UsernameSchema } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.hoisted(() => vi.fn());
vi.mock('./client', () => ({ default: { send } }));

const generated = vi.hoisted(() => ({ names: [] as string[] }));
vi.mock('@tvseri.es/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tvseri.es/utils')>();
  return {
    ...actual,
    generateUsername: () =>
      generated.names.shift() ?? actual.generateUsername(),
  };
});

const { createUser, findUser } = await import('./user');

const INPUT = {
  country: 'GB',
  email: 'Margaux.Realname+alias@example.com',
  name: 'Margaux Realname',
};

/**
 * Answers the user lookups: `taken` handles exist, no email exists.
 * `raceLost` handles and, with `emailRaceLost`, the email's claim fail
 * their condition in the sign-up transaction.
 */
function table({
  emailRaceLost = false,
  taken = [],
  raceLost = [],
}: Readonly<{
  emailRaceLost?: boolean;
  taken?: string[];
  raceLost?: string[];
}> = {}) {
  send.mockImplementation(async (command: unknown) => {
    if (command instanceof QueryCommand) {
      const key = unmarshall(command.input.ExpressionAttributeValues ?? {})[
        ':value'
      ] as string;
      const username = key.replace(/^USERNAME#/, '');
      return {
        Items: taken.includes(username)
          ? [marshall({ id: 'other', username })]
          : [],
      };
    }
    if (command instanceof GetItemCommand) {
      return {};
    }
    if (command instanceof TransactWriteItemsCommand) {
      const claim = unmarshall(
        command.input.TransactItems?.[0]?.Put?.Item ?? {},
      ).pk as string;
      const handleLost = raceLost.includes(claim.replace(/^HANDLE#/, ''));
      if (handleLost || emailRaceLost) {
        throw new TransactionCanceledException({
          $metadata: {},
          CancellationReasons: [
            { Code: handleLost ? 'ConditionalCheckFailed' : 'None' },
            { Code: emailRaceLost ? 'ConditionalCheckFailed' : 'None' },
            { Code: 'None' },
          ],
          message: 'Transaction cancelled',
        });
      }
      return {};
    }
    throw new Error('unexpected command');
  });
}

const writes = () =>
  send.mock.calls
    .map(([command]) => command as unknown)
    .filter((command) => command instanceof TransactWriteItemsCommand);

describe('createUser', () => {
  beforeEach(() => {
    send.mockReset();
    generated.names = [];
  });

  it('gives a new account a neutral generated handle', async () => {
    table();
    const user = await createUser(INPUT);

    expect(user.username).toMatch(/^[a-z]+-[a-z]+-\d{1,3}$/);
    const valid = UsernameSchema['~standard'].validate(user.username);
    expect(valid).not.toHaveProperty('issues');
    // Nothing of the email or the name is public
    for (const part of ['margaux', 'realname', 'alias', 'example']) {
      expect(user.username).not.toContain(part);
    }
  });

  it('claims the handle and the email and writes the user in one conditional transaction', async () => {
    table();
    generated.names = ['calm-otter-412'];
    await createUser(INPUT);

    const [write] = writes();
    const items = (write?.input.TransactItems ?? []).map(({ Put }) => ({
      condition: Put?.ConditionExpression,
      item: unmarshall(Put?.Item ?? {}),
    }));
    // The claim names its user, so deleting the account can take it along
    expect(items[0]).toEqual({
      condition: 'attribute_not_exists(pk)',
      item: { pk: 'HANDLE#calm-otter-412', userId: items[2]?.item.id },
    });
    // The email's claim: the normalised address, as the email index has it
    expect(items[1]).toEqual({
      condition: 'attribute_not_exists(pk)',
      item: {
        pk: `EMAIL#${Buffer.from('margaux.realname+alias@example.com').toString('base64url')}`,
        userId: items[2]?.item.id,
      },
    });
    expect(items[2]?.item.gsi1pk).toBe(items[1]?.item.pk);
    expect(items[2]?.condition).toBe('attribute_not_exists(pk)');
    expect(items[2]?.item).toMatchObject({
      country: 'GB',
      email: 'margaux.realname+alias@example.com',
      gsi2pk: 'USERNAME#calm-otter-412',
      name: 'Margaux Realname',
      username: 'calm-otter-412',
    });
  });

  it('tries another handle when one is taken or claimed at the same moment', async () => {
    table({ raceLost: ['bold-heron-7'], taken: ['calm-otter-412'] });
    generated.names = ['calm-otter-412', 'bold-heron-7', 'quiet-lynx-88'];

    const user = await createUser(INPUT);

    expect(user.username).toBe('quiet-lynx-88');
    expect(writes()).toHaveLength(2);
  });

  it('gives up after a few tries', async () => {
    table({ taken: ['calm-otter-412'] });
    generated.names = Array.from({ length: 5 }, () => 'calm-otter-412');

    await expect(createUser(INPUT)).rejects.toThrow('UserCreationFailed');
    expect(writes()).toHaveLength(0);
  });

  it('refuses the email when a parallel sign-up claimed it first, without trying other handles', async () => {
    table({ emailRaceLost: true });
    await expect(createUser(INPUT)).rejects.toThrow('UserAlreadyExists');
    expect(writes()).toHaveLength(1);
  });

  it('calls a lost email claim UserAlreadyExists even when the handle was lost too', async () => {
    table({ emailRaceLost: true, raceLost: ['calm-otter-412'] });
    generated.names = ['calm-otter-412'];
    await expect(createUser(INPUT)).rejects.toThrow('UserAlreadyExists');
    expect(writes()).toHaveLength(1);
  });

  it('refuses an email that already has an account', async () => {
    send.mockImplementation(async (command: unknown) =>
      command instanceof QueryCommand
        ? { Items: [marshall({ id: 'other', username: 'someone' })] }
        : {},
    );
    await expect(createUser(INPUT)).rejects.toThrow('UserAlreadyExists');
  });
});

describe('findUser by email', () => {
  beforeEach(() => {
    send.mockReset();
  });

  it('finds a user created a moment ago through the claim, strongly consistent', async () => {
    send.mockImplementation(async (command: unknown) => {
      if (!(command instanceof GetItemCommand)) {
        throw new Error('unexpected command');
      }
      const { pk } = unmarshall(command.input.Key ?? {});
      return pk.startsWith('EMAIL#')
        ? { Item: marshall({ pk, userId: 'U1' }) }
        : { Item: marshall({ email: 'ana@example.com', id: 'U1', pk }) };
    });

    const user = await findUser({ email: ' Ana@Example.com ' });

    expect(user?.id).toBe('U1');
    const reads = send.mock.calls.map(([command]) => command as GetItemCommand);
    expect(reads.map((read) => read.input.ConsistentRead)).toEqual([
      true,
      true,
    ]);
    expect(unmarshall(reads[0]?.input.Key ?? {}).pk).toBe(
      `EMAIL#${Buffer.from('ana@example.com').toString('base64url')}`,
    );
  });

  it('falls back to the email index for a user from before claims', async () => {
    send.mockImplementation(async (command: unknown) =>
      command instanceof QueryCommand
        ? { Items: [marshall({ id: 'OLD', username: 'someone' })] }
        : {},
    );
    expect((await findUser({ email: 'old@example.com' }))?.id).toBe('OLD');
  });

  it('finds nobody for an address with neither a claim nor an index entry', async () => {
    send.mockImplementation(async (command: unknown) =>
      command instanceof QueryCommand ? { Items: [] } : {},
    );
    expect(await findUser({ email: 'nobody@example.com' })).toBeNull();
  });
});
