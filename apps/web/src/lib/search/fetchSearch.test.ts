import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSearchClient } from './fetchSearch';
import { BRE } from './testData';

describe('fetchSearch', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(BRE)),
    );
  });

  it('asks /api/search with the normalised query (one CDN key)', async () => {
    const { fetchSearch } = createSearchClient();

    await expect(
      fetchSearch('breaking bad', new AbortController().signal),
    ).resolves.toEqual(BRE);
    expect(vi.mocked(fetch).mock.lastCall?.[0]).toBe(
      '/api/search?q=breaking%20bad',
    );
  });

  it('rejects a failed response instead of reading it as results', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ error: 'SearchFailed' }, { status: 502 }),
    );
    const { fetchSearch } = createSearchClient();

    await expect(
      fetchSearch('boom', new AbortController().signal),
    ).rejects.toThrow('502');
  });

  it('passes the abort signal on, so a newer keystroke cancels it', async () => {
    const { fetchSearch } = createSearchClient();
    const controller = new AbortController();

    await fetchSearch('bre', controller.signal);

    expect(vi.mocked(fetch).mock.lastCall?.[1]?.signal).toBe(controller.signal);
  });

  it('remembers answers, so going back a keystroke needs no request', async () => {
    const { cached, fetchSearch } = createSearchClient();

    expect(cached('bre')).toBeUndefined();
    await fetchSearch('bre', new AbortController().signal);

    expect(cached('bre')).toEqual(BRE);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not remember failures', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    const { cached, fetchSearch } = createSearchClient();

    await fetchSearch('boom', new AbortController().signal).catch(() => null);

    expect(cached('boom')).toBeUndefined();
  });
});

describe('fetchSearch with the member lookup (signed in)', () => {
  const JUNO = { id: '01JUNO', username: 'juno-tv' };

  /** `/api/search` answers BRE; `/api/me/member` answers `member` */
  const answer = (member: unknown, memberStatus = 200) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.startsWith('/api/me/member')
          ? Response.json(member, { status: memberStatus })
          : Response.json(BRE),
      ),
    );

  const urls = () => vi.mocked(fetch).mock.calls.map(([url]) => url);

  it('with a leading @ asks only for the member, who is the best match', async () => {
    answer({ member: JUNO });
    const { fetchSearch } = createSearchClient({ members: () => true });

    await expect(
      fetchSearch('@juno-tv', new AbortController().signal),
    ).resolves.toEqual({
      best: 'members',
      members: [JUNO],
      people: [],
      series: [],
    });
    expect(urls()).toEqual(['/api/me/member?handle=%40juno-tv']);
  });

  it('nobody with that handle: no member', async () => {
    answer({ member: null });
    const { fetchSearch } = createSearchClient({ members: () => true });

    await expect(
      fetchSearch('@nobody', new AbortController().signal),
    ).resolves.toEqual({
      best: 'members',
      members: [],
      people: [],
      series: [],
    });
  });

  it('a failed lookup for an @ query is a failed search', async () => {
    answer({ error: 'Failed' }, 502);
    const { fetchSearch } = createSearchClient({ members: () => true });

    await expect(
      fetchSearch('@juno-tv', new AbortController().signal),
    ).rejects.toThrow('502');
  });

  it.each(['juno-tv', `@${'a'.repeat(31)}`, '@juno_tv', '@jo'])(
    'asks only the search for %j: no @, or no handle after it',
    async (key) => {
      answer({ member: JUNO });
      const { fetchSearch } = createSearchClient({ members: () => true });

      await expect(
        fetchSearch(key, new AbortController().signal),
      ).resolves.toEqual(BRE);
      expect(urls()).toHaveLength(1);
    },
  );

  it('signed out: no lookup, no extra request, even for an @ query', async () => {
    answer({ member: JUNO });
    const { fetchSearch } = createSearchClient({ members: () => false });

    await expect(
      fetchSearch('@juno-tv', new AbortController().signal),
    ).resolves.toEqual(BRE);
    expect(urls()).toEqual(['/api/search?q=%40juno-tv']);
  });
});
