import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createSearchController,
  DEBOUNCE_MS,
  type SearchEnv,
  STALL_MS,
} from './controller';
import type { createSearchClient } from './fetchSearch';
import type { SearchView } from './searchView';
import { BRE, BRYAN } from './testData';

type Client = ReturnType<typeof createSearchClient>;

/** A client whose answers the test releases by hand. */
function fakeClient(answers: Readonly<Record<string, SearchView>>) {
  const pending: Array<{
    key: string;
    signal: AbortSignal;
    release: () => void;
    fail: () => void;
  }> = [];
  const cache = new Map<string, SearchView>();
  const client: Client = {
    cached: (key) => cache.get(key),
    fetchSearch: (key, signal) =>
      new Promise<SearchView>((resolve, reject) => {
        pending.push({
          fail: () => reject(new Error('Search failed with status 502')),
          key,
          release: () => {
            const answer = answers[key] ?? {
              best: null,
              people: [],
              series: [],
            };
            cache.set(key, answer);
            resolve(answer);
          },
          signal,
        });
        signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      }),
  };
  return { client, pending };
}

const flush = () => vi.advanceTimersByTimeAsync(0);

describe('createSearchController', () => {
  let opened: string[];
  let env: SearchEnv;

  beforeEach(() => {
    vi.useFakeTimers();
    opened = [];
    env = {
      context: { layout: 'desktop', recents: [] },
      onOpen: (cell) => opened.push(cell.href),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it(`waits ${DEBOUNCE_MS} ms after the last keystroke and sends one request`, async () => {
    const { client, pending } = fakeClient({ bre: BRE });
    const search = createSearchController(client);

    search.input('b', env);
    search.input('br', env);
    search.input('Bre', env);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    expect(pending).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(pending.map((request) => request.key)).toEqual(['bre']);
  });

  it('aborts the request in flight when the next one goes out', async () => {
    const { client, pending } = fakeClient({});
    const search = createSearchController(client);

    search.input('bre', env);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    search.input('bryan', env);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(pending[0]?.signal.aborted).toBe(true);
    expect(pending[1]?.signal.aborted).toBe(false);
  });

  it('Enter during the debounce sends at once and opens the first result when it lands', async () => {
    const { client, pending } = fakeClient({ bryan: BRYAN });
    const search = createSearchController(client);

    search.input('bryan', env);
    search.enter(env);
    expect(pending.map((request) => request.key)).toEqual(['bryan']);
    expect(opened).toEqual([]);

    pending[0]?.release();
    await flush();
    expect(opened).toEqual(['/person/17419/bryan-cranston']);
  });

  it('a failed request ends pending with the error row', async () => {
    const { client, pending } = fakeClient({});
    const search = createSearchController(client);

    search.input('boom', env);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    pending[0]?.fail();
    await flush();

    expect(search.store.getState().status).toBe('error');
  });

  it('try again asks for the same query', async () => {
    const { client, pending } = fakeClient({});
    const search = createSearchController(client);

    search.input('boom', env);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    pending[0]?.fail();
    await flush();
    search.retry(env);

    expect(pending.map((request) => request.key)).toEqual(['boom', 'boom']);
    expect(search.store.getState().status).toBe('pending');
  });

  it('an answer already fetched lands without a request or a wait', async () => {
    const { client, pending } = fakeClient({ bre: BRE, bry: BRYAN });
    const search = createSearchController(client);

    search.input('bre', env);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    pending[0]?.release();
    await flush();
    search.input('bry', env);
    search.input('bre', env);

    expect(pending).toHaveLength(1);
    expect(search.store.getState()).toMatchObject({
      shown: 'bre',
      status: 'ready',
    });
  });

  it('tells which result Enter would open once results land (to prefetch it)', async () => {
    const { client, pending } = fakeClient({ bre: BRE });
    const targets: string[] = [];
    const search = createSearchController(client);

    search.input('bre', {
      ...env,
      onTarget: (cell) => targets.push(cell.href),
    });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    pending[0]?.release();
    await flush();

    expect(targets).toEqual(['/1396/breaking-bad']);
  });

  it('dispose cancels the timer and the request in flight', async () => {
    const { client, pending } = fakeClient({});
    const search = createSearchController(client);

    search.input('bre', env);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    search.input('bryan', env);
    search.dispose();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(pending).toHaveLength(1);
    expect(pending[0]?.signal.aborted).toBe(true);
  });

  it('closing during Enter-ahead opens nothing, even when the answer was already on its way', async () => {
    const { client, pending } = fakeClient({ bre: BRE });
    const search = createSearchController(client);

    search.input('bre', env);
    search.enter(env);
    // the answer resolves, then Escape closes before its callback runs
    pending[0]?.release();
    search.dispose();
    await flush();

    expect(opened).toEqual([]);
  });

  it('after closing, nothing more is dispatched (input, Enter, retry)', async () => {
    const { client, pending } = fakeClient({ bre: BRE });
    const search = createSearchController(client);

    search.dispose();
    search.input('bre', env);
    search.enter(env);
    search.retry(env);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(pending).toHaveLength(0);
    expect(opened).toEqual([]);
  });

  it('resume after a stop takes input again (Strict Mode re-attaches the dialog)', async () => {
    const { client, pending } = fakeClient({ bre: BRE });
    const search = createSearchController(client);

    search.dispose();
    search.resume(env);
    search.input('bre', env);
    expect(search.store.getState().query).toBe('bre');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    pending[0]?.release();
    await flush();

    expect(pending.map((request) => request.key)).toEqual(['bre']);
    expect(search.store.getState().status).toBe('ready');
  });

  it('resume sends again the search a stop cut off, so it never stays pending', async () => {
    const { client, pending } = fakeClient({ 'the bear': BRE });
    const search = createSearchController(client);

    search.input('the bear', env);
    search.flush(env);
    search.dispose();
    search.resume(env);

    expect(pending.map((request) => request.signal.aborted)).toEqual([
      true,
      false,
    ]);
    pending[1]?.release();
    await flush();
    expect(search.store.getState().status).toBe('ready');
  });

  it('resume on a search that never stopped sends nothing', () => {
    const { client, pending } = fakeClient({});
    const search = createSearchController(client);

    search.input('bre', env);
    search.flush(env);
    search.resume(env);

    expect(pending).toHaveLength(1);
  });

  it('never asks for more than the API accepts (100 characters)', async () => {
    const { client, pending } = fakeClient({});
    const search = createSearchController(client);

    search.input(`${'a long pasted title '.repeat(10)}`, env);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(pending).toHaveLength(1);
    expect(pending[0]?.key.length).toBeLessThanOrEqual(100);
    expect(pending[0]?.key.endsWith(' ')).toBe(false);
  });

  it('flush sends a prefilled query at once, without opening anything', async () => {
    const { client, pending } = fakeClient({ 'the bear': BRE });
    const search = createSearchController(client);

    search.input('the bear', env);
    search.flush(env);
    expect(pending.map((request) => request.key)).toEqual(['the bear']);

    pending[0]?.release();
    await flush();
    expect(search.store.getState().status).toBe('ready');
    expect(opened).toEqual([]);
  });

  it('starts from a restored session', () => {
    const { client } = fakeClient({});
    const search = createSearchController(client, {
      enterAhead: false,
      query: 'bre',
      requested: 'bre',
      results: BRE,
      selected: 0,
      shown: 'bre',
      stalled: false,
      status: 'ready',
    });

    expect(search.store.getState().query).toBe('bre');
  });

  /**
   * Nothing shows for an answer that lands within 250 ms of the
   * first request of a pending period; after that the screen is stale until
   * the answer lands. Later keys and requests never restart the wait.
   */
  describe('stalled', () => {
    const stalled = (search: ReturnType<typeof createSearchController>) =>
      search.store.getState().stalled;

    it('a fast answer (200 ms after the request) never stalls', async () => {
      const { client, pending } = fakeClient({ bre: BRE });
      const search = createSearchController(client);
      const seen: boolean[] = [];
      search.store.subscribe((state) => seen.push(state.stalled));

      search.input('bre', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 200);
      pending[0]?.release();
      await flush();
      await vi.advanceTimersByTimeAsync(1000);

      expect(search.store.getState().status).toBe('ready');
      expect(seen).not.toContain(true);
    });

    it(`a slow answer stalls ${STALL_MS} ms after the request goes out, not before`, async () => {
      const { client, pending } = fakeClient({ bre: BRE });
      const search = createSearchController(client);

      search.input('bre', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      expect(pending).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(STALL_MS - 1);
      expect(stalled(search)).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(stalled(search)).toBe(true);
    });

    it('the debounce alone never stalls: the wait starts with the request', async () => {
      const { client } = fakeClient({});
      const search = createSearchController(client);

      // a key every 100 ms for a second: the debounce never ends
      for (let i = 1; i <= 10; i += 1) {
        search.input('b'.repeat(i), env);
        await vi.advanceTimersByTimeAsync(100);
      }

      expect(stalled(search)).toBe(false);
    });

    it('a typing burst stalls once, from the first request, and stays stalled until the last answer lands', async () => {
      const { client, pending } = fakeClient({ 'the bear': BRE });
      const search = createSearchController(client);
      const changes: boolean[] = [];
      search.store.subscribe((state, previous) => {
        if (state.stalled !== previous.stalled) {
          changes.push(state.stalled);
        }
      });

      // a pause after “the” sends it; then the rest, with pauses that send again
      search.input('the', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      search.input('the b', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      expect(stalled(search)).toBe(false);
      // 250 ms after “the” went out, though “the b” went out 150 ms ago
      await vi.advanceTimersByTimeAsync(STALL_MS - DEBOUNCE_MS);
      expect(stalled(search)).toBe(true);
      search.input('the be', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      search.input('the bear', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 1000);
      expect(stalled(search)).toBe(true);

      pending.at(-1)?.release();
      await flush();
      expect(pending.map((request) => request.key)).toEqual([
        'the',
        'the b',
        'the be',
        'the bear',
      ]);
      expect(changes).toEqual([true, false]);
    });

    it('landing clears it, and the next request waits again from its own start', async () => {
      const { client, pending } = fakeClient({ bre: BRE, breaking: BRE });
      const search = createSearchController(client);

      search.input('bre', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + STALL_MS);
      expect(stalled(search)).toBe(true);
      pending[0]?.release();
      await flush();
      expect(stalled(search)).toBe(false);

      search.input('breaking', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + STALL_MS - 1);
      expect(stalled(search)).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(stalled(search)).toBe(true);
    });

    it('a failed request clears it; Try again waits again', async () => {
      const { client, pending } = fakeClient({});
      const search = createSearchController(client);

      search.input('boom', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + STALL_MS);
      pending[0]?.fail();
      await flush();
      expect(search.store.getState()).toMatchObject({
        stalled: false,
        status: 'error',
      });

      search.retry(env);
      await vi.advanceTimersByTimeAsync(STALL_MS);
      expect(stalled(search)).toBe(true);
    });

    it('emptying the field clears it and cancels the wait', async () => {
      const { client } = fakeClient({});
      const search = createSearchController(client);

      search.input('bre', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + STALL_MS);
      expect(stalled(search)).toBe(true);
      search.input('', env);
      expect(stalled(search)).toBe(false);

      // emptied before the wait ran out: it never fires
      search.input('bre', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 100);
      search.input('', env);
      await vi.advanceTimersByTimeAsync(STALL_MS);
      expect(stalled(search)).toBe(false);
    });

    it('closing clears it and cancels the wait', async () => {
      const { client } = fakeClient({});
      const search = createSearchController(client);

      search.input('bre', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + STALL_MS);
      search.dispose();
      expect(stalled(search)).toBe(false);

      const other = createSearchController(fakeClient({}).client);
      other.input('bre', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 100);
      other.dispose();
      await vi.advanceTimersByTimeAsync(STALL_MS);
      expect(stalled(other)).toBe(false);
    });

    it('an answer already fetched lands at once and never stalls', async () => {
      const { client, pending } = fakeClient({ bre: BRE, bry: BRYAN });
      const search = createSearchController(client);
      search.input('bre', env);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      pending[0]?.release();
      await flush();

      const seen: boolean[] = [];
      search.store.subscribe((state) => seen.push(state.stalled));
      search.input('br', env);
      search.input('bre', env);
      await vi.advanceTimersByTimeAsync(STALL_MS * 2);

      expect(search.store.getState().status).toBe('ready');
      expect(seen).not.toContain(true);
    });
  });
});
