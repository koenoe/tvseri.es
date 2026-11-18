import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  unstable_rethrow: () => {},
}));
vi.mock('@/lib/getBaseUrl', () => ({ default: () => 'https://example.test' }));

const { entityMetadata, resolveEntityRoute } = await import('./entityRoute');

type Thing = Readonly<{ id: number; slug: string; name: string }>;
const THING: Thing = { id: 7, name: 'Seven', slug: 'seven' };
const spec = (answer: Thing | null | Readonly<{ unavailable: true }>) => ({
  entity: (thing: Thing) => thing,
  load: vi.fn(async () => answer),
  toPath: (id: number | string, slug?: string | null) =>
    slug ? `/t/${id}/${slug}` : `/t/${id}`,
});

describe('resolveEntityRoute', () => {
  it('an id that can’t be one is not found, without a read', async () => {
    const thing = spec(THING);
    expect(await resolveEntityRoute({ id: 'abc' }, thing)).toEqual({
      kind: 'not-found',
    });
    expect(thing.load).not.toHaveBeenCalled();
  });

  it('unknown, down, stale slug, canonical', async () => {
    expect(
      await resolveEntityRoute({ id: '7', slug: ['seven'] }, spec(null)),
    ).toEqual({ kind: 'not-found' });
    expect(
      await resolveEntityRoute({ id: '7' }, spec({ unavailable: true })),
    ).toEqual({ kind: 'unavailable' });
    expect(
      await resolveEntityRoute({ id: '7', slug: ['old'] }, spec(THING)),
    ).toEqual({ kind: 'redirect', loaded: THING, path: '/t/7/seven' });
    expect(
      await resolveEntityRoute({ id: '7', slug: ['seven'] }, spec(THING)),
    ).toEqual({ kind: 'ok', loaded: THING });
  });
});

describe('entityMetadata', () => {
  const describeThing = (thing: Thing) =>
    ({ description: 'About', title: thing.name, type: 'profile' }) as const;

  it('is the canonical page’s, in British English', async () => {
    const meta = await entityMetadata(
      { id: '7', slug: ['seven'] },
      spec(THING),
      describeThing,
    );
    expect(meta).toMatchObject({
      alternates: { canonical: 'https://example.test/t/7/seven' },
      openGraph: { locale: 'en_GB', title: 'Seven', type: 'profile' },
      title: 'Seven',
    });
  });

  it('a stale slug points at the canonical URL, not indexed', async () => {
    expect(
      await entityMetadata(
        { id: '7', slug: ['x'] },
        spec(THING),
        describeThing,
      ),
    ).toEqual({
      alternates: { canonical: 'https://example.test/t/7/seven' },
      robots: { index: false },
    });
  });

  it('unknown is the 404 status; down is no metadata', async () => {
    await expect(
      entityMetadata({ id: '7' }, spec(null), describeThing),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(
      await entityMetadata(
        { id: '7' },
        spec({ unavailable: true }),
        describeThing,
      ),
    ).toEqual({});
  });
});
