import { describe, expect, it, vi } from 'vitest';

import type { ImportEvent, ImportRow } from './contract';
import { planChunks, runChunks } from './runChunks';

const rows = (count: number): ImportRow[] =>
  Array.from({ length: count }, (_, index) => ({
    episode: index + 1,
    index,
    season: 1,
    title: 'Dark',
    watchedAt: null,
  }));

const progress = (written: number): ImportEvent => ({
  current: 'Dark',
  problems: [],
  shows: [],
  skipped: 0,
  status: 'progress',
  written,
});

/** A streamed body, cut into the given byte pieces (lines may split anywhere). */
const streamOf = (pieces: ReadonlyArray<string>) => {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const piece of pieces) {
        controller.enqueue(encoder.encode(piece));
      }
      controller.close();
    },
  });
};

const ndjson = (...events: ReadonlyArray<unknown>) =>
  events.map((event) => `${JSON.stringify(event)}\n`).join('');

type Body = Readonly<{ importId?: string; rows: ReadonlyArray<ImportRow> }>;

const fakeFetch = (answer: (body: Body, call: number) => Response) => {
  const bodies: Body[] = [];
  const urls: string[] = [];
  const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Body;
    bodies.push(body);
    urls.push(String(url));
    return answer(body, bodies.length - 1);
  });
  return { bodies, fetcher: fetcher as unknown as typeof fetch, urls };
};

const ok = (text: string) => new Response(streamOf([text]));

const row = (index: number, title: string, extra = {}): ImportRow => ({
  episode: index + 1,
  index,
  season: 1,
  title,
  watchedAt: null,
  ...extra,
});

describe('planChunks', () => {
  it('keeps each show’s rows together, in the order shows first appear', () => {
    const file = [
      row(0, 'Dark'),
      row(1, 'Ozark'),
      row(2, ' dark '),
      row(3, 'Lupin'),
      row(4, 'Ozark'),
    ];
    expect(
      planChunks(file, 3).map((chunk) => chunk.map(({ index }) => index)),
    ).toEqual([
      [0, 2],
      [1, 4, 3],
    ]);
  });

  it('splits a show bigger than a chunk over whole chunks in a row', () => {
    const file = [row(0, 'Lupin'), ...rows(5), row(6, 'Ozark')];
    expect(
      planChunks(file, 3).map((chunk) => chunk.map(({ title }) => title)),
    ).toEqual([['Lupin'], ['Dark', 'Dark', 'Dark'], ['Dark', 'Dark', 'Ozark']]);
  });

  it('groups a picked series by its id, not its title', () => {
    const file = [
      row(0, 'Top Boy', { seriesId: 1 }),
      row(1, 'Top Boy', { seriesId: 2 }),
      row(2, 'Top Boy', { seriesId: 1 }),
    ];
    expect(
      planChunks(file, 1).map((chunk) => chunk.map(({ index }) => index)),
    ).toEqual([[0], [2], [1]]);
  });
});

describe('runChunks', () => {
  it('sends the rows in chunks of 50, one after another, with the import id', async () => {
    const { bodies, fetcher, urls } = fakeFetch((body) =>
      ok(ndjson(progress(body.rows.length))),
    );
    const onEvent = vi.fn();
    const onChunkDone = vi.fn();

    const outcome = await runChunks({
      fetcher,
      importId: 'imp-1',
      kind: 'import',
      onChunkDone,
      onEvent,
      rows: rows(120),
      signal: new AbortController().signal,
    });

    expect(outcome).toEqual({ status: 'done' });
    expect(bodies.map((body) => body.rows.length)).toEqual([50, 50, 20]);
    expect(bodies.every((body) => body.importId === 'imp-1')).toBe(true);
    expect(urls).toEqual([
      '/api/account/import',
      '/api/account/import',
      '/api/account/import',
    ]);
    expect(
      onEvent.mock.calls.map(([event, chunk]) => [event.written, chunk]),
    ).toEqual([
      [50, 0],
      [50, 1],
      [20, 2],
    ]);
    expect(onChunkDone.mock.calls.map(([chunk]) => chunk)).toEqual([0, 1, 2]);
  });

  it('checks in chunks of 100 with a few requests in flight', async () => {
    let inFlight = 0;
    let most = 0;
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Body;
        inFlight += 1;
        most = Math.max(most, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return ok(
          ndjson({
            alreadyWatched: 0,
            matched: body.rows.length,
            problems: [],
            seriesIds: [],
            status: 'checked',
          }),
        );
      },
    ) as unknown as typeof fetch;
    const onEvent = vi.fn();

    const outcome = await runChunks({
      fetcher,
      kind: 'check',
      onEvent,
      rows: rows(1000),
      signal: new AbortController().signal,
    });

    expect(outcome).toEqual({ status: 'done' });
    expect(fetcher).toHaveBeenCalledTimes(10);
    expect(most).toBe(3);
    expect(
      onEvent.mock.calls.reduce((sum, [event]) => sum + event.matched, 0),
    ).toBe(1000);
  });

  it('asks for a dry run without an import id', async () => {
    const { bodies, fetcher, urls } = fakeFetch(() =>
      ok(
        ndjson({
          alreadyWatched: 0,
          matched: 2,
          problems: [],
          seriesIds: [1],
          status: 'checked',
        }),
      ),
    );
    const onEvent = vi.fn();

    await runChunks({
      fetcher,
      kind: 'check',
      onEvent,
      rows: rows(2),
      signal: new AbortController().signal,
    });

    expect(urls).toEqual(['/api/account/import?dryRun=1']);
    expect(bodies[0]).toEqual({ rows: rows(2) });
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ matched: 2 }),
      0,
    );
  });

  it('reads events whose lines are split across stream pieces', async () => {
    const text = ndjson(progress(25), progress(25));
    const { fetcher } = fakeFetch(
      () =>
        new Response(
          streamOf([text.slice(0, 17), text.slice(17, 70), text.slice(70)]),
        ),
    );
    const onEvent = vi.fn();

    await runChunks({
      fetcher,
      importId: 'imp-1',
      kind: 'import',
      onEvent,
      rows: rows(50),
      signal: new AbortController().signal,
    });

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent.mock.calls.map(([event]) => event.written)).toEqual([
      25, 25,
    ]);
  });

  it('resumes from the given chunk', async () => {
    const { bodies, fetcher } = fakeFetch((body) =>
      ok(ndjson(progress(body.rows.length))),
    );

    await runChunks({
      fetcher,
      from: 2,
      importId: 'imp-1',
      kind: 'import',
      onEvent: vi.fn(),
      rows: rows(120),
      signal: new AbortController().signal,
    });

    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.rows[0]?.index).toBe(100);
  });

  it('stops on a 401 as the session ending, at the chunk that failed', async () => {
    const { fetcher } = fakeFetch((_, call) =>
      call === 1
        ? new Response(null, { status: 401 })
        : ok(ndjson(progress(50))),
    );
    const onChunkDone = vi.fn();

    const outcome = await runChunks({
      fetcher,
      importId: 'imp-1',
      kind: 'import',
      onChunkDone,
      onEvent: vi.fn(),
      rows: rows(150),
      signal: new AbortController().signal,
    });

    expect(outcome).toEqual({
      chunk: 1,
      reason: 'unauthenticated',
      status: 'stopped',
    });
    expect(onChunkDone).toHaveBeenCalledTimes(1);
  });

  it('stops on an error event mid-stream, keeping the events before it', async () => {
    const { fetcher } = fakeFetch(() =>
      ok(ndjson(progress(25), { error: 'unauthenticated', status: 'error' })),
    );
    const onEvent = vi.fn();
    const onChunkDone = vi.fn();

    const outcome = await runChunks({
      fetcher,
      importId: 'imp-1',
      kind: 'import',
      onChunkDone,
      onEvent,
      rows: rows(50),
      signal: new AbortController().signal,
    });

    expect(outcome).toEqual({
      chunk: 0,
      reason: 'unauthenticated',
      status: 'stopped',
    });
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onChunkDone).not.toHaveBeenCalled();
  });

  it('stops as failed on a server error, a conflict on a 409', async () => {
    const failing = fakeFetch(() => new Response(null, { status: 502 }));
    const conflicting = fakeFetch(() => new Response(null, { status: 409 }));
    const options = {
      importId: 'imp-1',
      kind: 'import' as const,
      onEvent: vi.fn(),
      rows: rows(10),
      signal: new AbortController().signal,
    };

    expect(await runChunks({ ...options, fetcher: failing.fetcher })).toEqual({
      chunk: 0,
      reason: 'failed',
      status: 'stopped',
    });
    expect(
      await runChunks({ ...options, fetcher: conflicting.fetcher }),
    ).toEqual({
      chunk: 0,
      reason: 'conflict',
      status: 'stopped',
    });
  });

  it('stops as failed when the network drops', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    expect(
      await runChunks({
        fetcher,
        importId: 'imp-1',
        kind: 'import',
        onEvent: vi.fn(),
        rows: rows(10),
        signal: new AbortController().signal,
      }),
    ).toEqual({ chunk: 0, reason: 'failed', status: 'stopped' });
  });

  it('ends quietly when aborted, sending no further chunk', async () => {
    const controller = new AbortController();
    const { bodies, fetcher } = fakeFetch((body) => {
      controller.abort();
      return ok(ndjson(progress(body.rows.length)));
    });

    const outcome = await runChunks({
      fetcher,
      importId: 'imp-1',
      kind: 'import',
      onEvent: vi.fn(),
      rows: rows(150),
      signal: controller.signal,
    });

    expect(outcome).toEqual({ status: 'aborted' });
    expect(bodies).toHaveLength(1);
  });
});
