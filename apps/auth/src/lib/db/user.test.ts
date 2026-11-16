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

const { createUser } = await import('./user');

const INPUT = {
  country: 'GB',
  email: 'Margaux.Realname+alias@example.com',
  name: 'Margaux Realname',
};

/** Answers the user lookups: `taken` handles exist, no email exists. */
function table({
  taken = [],
  raceLost = [],
}: Readonly<{ taken?: string[]; raceLost?: string[] }> = {}) {
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
      if (raceLost.includes(claim.replace(/^HANDLE#/, ''))) {
        throw new TransactionCanceledException({
          $metadata: {},
          CancellationReasons: [
            { Code: 'ConditionalCheckFailed' },
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

  it.each(Array.from({ length: 20 }, (_, i) => i))(
    'never derives the handle from the email or name (run %i)',
    async () => {
      table();
      const user = await createUser({
        email: 'happy.penguin@example.com',
        name: 'Happy Penguin',
      });
      // the words come from the list, the email's local part never as a whole
      expect(user.username).not.toBe('happypenguin');
      expect(user.username).not.toBe('happy-penguin');
      expect(user.username).toMatch(/-\d{1,3}$/);
    },
  );

  it('claims the handle and writes the user in one conditional transaction', async () => {
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
      item: { pk: 'HANDLE#calm-otter-412', userId: items[1]?.item.id },
    });
    expect(items[1]?.condition).toBe('attribute_not_exists(pk)');
    expect(items[1]?.item).toMatchObject({
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

  it('refuses an email that already has an account', async () => {
    send.mockImplementation(async (command: unknown) =>
      command instanceof QueryCommand
        ? { Items: [marshall({ id: 'other', username: 'someone' })] }
        : {},
    );
    await expect(createUser(INPUT)).rejects.toThrow('UserAlreadyExists');
  });
});
