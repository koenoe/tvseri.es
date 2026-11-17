// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImportProblem, ImportRequest } from '@/lib/import/contract';

vi.mock('./actions', () => ({
  importStatus: vi.fn(async () => ({ data: { lastImport: null }, ok: true })),
  startImport: vi.fn(async () => ({
    data: { createdAt: 1_700_000_000_000, importId: 'imp-1' },
    ok: true,
  })),
  undoImport: vi.fn(async () => ({ data: { requestedAt: 1 }, ok: true })),
}));
vi.mock('@/components/ui/toast/showToast', () => ({ showToast: vi.fn() }));
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const { showToast } = await import('@/components/ui/toast/showToast');
const { importStatus, undoImport } = await import('./actions');
const { importedCount } = await import('./importState');
const { useImporter } = await import('./useImporter');

const CSV = [
  'Title,Date',
  '"Top Boy: Season 1: Episode 1","9/14/26"',
  '"Top Boy: Season 1: Episode 2","9/15/26"',
  '"Dark: Season 1: Secrets","9/16/26"',
].join('\n');

const topBoy = (index: number, episode: string): ImportProblem => ({
  candidates: [
    {
      id: 19,
      network: 'Netflix',
      posterImage: null,
      title: 'Top Boy',
      year: '2019',
    },
    {
      id: 11,
      network: 'Channel 4',
      posterImage: null,
      title: 'Top Boy',
      year: '2011',
    },
  ],
  index,
  kind: 'ambiguous',
  row: { episode, season: 'Season 1', title: 'Top Boy' },
});

const line = (value: unknown) => `${JSON.stringify(value)}\n`;

type Call = Readonly<{ url: string; body: ImportRequest }>;

let calls: Call[];
/** While set, a fix's write waits for it (an in-flight pick) */
let holdFixes: Promise<void> | null;

beforeEach(() => {
  calls = [];
  holdFixes = null;
  vi.mocked(showToast).mockClear();
  vi.mocked(undoImport).mockClear();
  refresh.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as ImportRequest;
      calls.push({ body, url });
      if (url.includes('dryRun=1')) {
        return new Response(
          line({
            alreadyWatched: 0,
            matched: 1,
            problems: [topBoy(0, 'Episode 1'), topBoy(1, 'Episode 2')],
            seriesIds: [1],
            status: 'checked',
          }),
        );
      }
      const isFix = body.rows.some((row) => row.seriesId !== undefined);
      if (isFix && holdFixes) {
        await holdFixes;
      }
      return new Response(
        isFix
          ? line({
              current: 'Top Boy',
              problems: [],
              shows: [],
              skipped: 0,
              status: 'progress',
              written: body.rows.length,
            })
          : line({
              current: 'Dark',
              problems: [topBoy(0, 'Episode 1'), topBoy(1, 'Episode 2')],
              shows: [],
              skipped: 0,
              status: 'progress',
              written: 1,
            }),
      );
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

type Hook = Awaited<ReturnType<typeof importedWithProblems>>;

const runOf = (hook: Hook) => {
  const { state } = hook.result.current;
  if (state.step !== 'import') {
    throw new Error(`expected the import step, got ${state.step}`);
  }
  return state.run;
};

/** "Two shows with this name": Top Boy (2019) picked for both rows. */
const pickTopBoy = (hook: Hook) => {
  const { state } = hook.result.current;
  const rows = state.step === 'import' ? state.prepared.rows : [];
  act(() =>
    hook.result.current.pick({
      fix: {
        imported: 2,
        kind: 'picked',
        label: 'Top Boy (2019)',
        rows: 2,
        status: 'waiting',
      },
      key: 'amb:top boy',
      rows: [0, 1].map((index) => ({ ...rows[index]!, seriesId: 19 })),
      toast: 'Imported 2 episodes of Top Boy (2019)',
    }),
  );
};

/** A `beforeunload` the page would answer with "Leave site?" */
const leaveIsWarned = () => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

const errorToasts = () =>
  vi.mocked(showToast).mock.calls.filter(([toast]) => toast.tone === 'error');

const importedWithProblems = async () => {
  const hook = renderHook(() => useImporter());
  act(() => {
    hook.result.current.onFiles([
      new File([CSV], 'NetflixViewingHistory.csv', { type: 'text/csv' }),
    ]);
  });
  await waitFor(() => expect(hook.result.current.state.step).toBe('check'));
  await waitFor(() => {
    const { state } = hook.result.current;
    expect(state.step === 'check' && state.check.status).toBe('done');
  });
  act(() => hook.result.current.beginImport());
  await waitFor(() => {
    const { state } = hook.result.current;
    expect(state.step === 'import' && state.run.phase).toBe('done');
  });
  return hook;
};

describe('useImporter', () => {
  it('checks without writing, then imports with the new import id', async () => {
    await importedWithProblems();
    expect(calls.map((call) => [call.url, call.body.importId])).toEqual([
      ['/api/account/import?dryRun=1', undefined],
      ['/api/account/import', 'imp-1'],
    ]);
    expect(calls[0]?.body.rows.map((row) => row.title)).toEqual([
      'Top Boy',
      'Top Boy',
      'Dark',
    ]);
  });

  it('sends a picked show’s rows again with its id once Undo has passed', async () => {
    const hook = await importedWithProblems();
    vi.useFakeTimers();
    const rows =
      hook.result.current.state.step === 'import'
        ? hook.result.current.state.prepared.rows
        : [];

    act(() =>
      hook.result.current.pick({
        fix: {
          imported: 2,
          kind: 'picked',
          label: 'Top Boy (2019)',
          rows: 2,
          status: 'waiting',
        },
        key: 'amb:top boy',
        rows: [0, 1].map((index) => ({ ...rows[index]!, seriesId: 19 })),
        toast: 'Imported 2 episodes of Top Boy (2019)',
      }),
    );
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Imported 2 episodes of Top Boy (2019)',
      }),
    );
    expect(calls).toHaveLength(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    vi.useRealTimers();
    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[2]?.body.rows.map((row) => row.seriesId)).toEqual([19, 19]);
    await waitFor(() => {
      const { state } = hook.result.current;
      expect(
        state.step === 'import' && state.run.fixes['amb:top boy'],
      ).toMatchObject({ imported: 2, status: 'sent' });
    });
    // once for the import, once for the pick (the nav line counts it)
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('sends nothing when the pick is undone in time', async () => {
    const hook = await importedWithProblems();
    vi.useFakeTimers();
    act(() =>
      hook.result.current.pick({
        fix: {
          imported: 2,
          kind: 'picked',
          label: 'Top Boy (2019)',
          rows: 2,
          status: 'waiting',
        },
        key: 'amb:top boy',
        rows: [],
        toast: 'Imported 2 episodes of Top Boy (2019)',
      }),
    );
    act(() => hook.result.current.clearFix('amb:top boy'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(calls).toHaveLength(2);
    const { state } = hook.result.current;
    expect(state.step === 'import' && state.run.fixes).toEqual({});
  });

  it('counts a pick only once its write has answered', async () => {
    const hook = await importedWithProblems();
    vi.useFakeTimers();
    const before = importedCount(runOf(hook));
    pickTopBoy(hook);
    expect(importedCount(runOf(hook))).toBe(before);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    vi.useRealTimers();
    await waitFor(() => expect(importedCount(runOf(hook))).toBe(before + 2));
  });

  it('Undo cancels a pick still in its grace: it is never sent', async () => {
    vi.mocked(importStatus).mockResolvedValue({
      data: {
        lastImport: {
          createdAt: 1,
          importId: 'imp-1',
          undoneAt: 2,
          written: 1,
        },
      },
      ok: true,
    });
    const hook = await importedWithProblems();
    vi.useFakeTimers();
    pickTopBoy(hook);

    await act(async () => {
      await hook.result.current.confirmUndo();
    });
    expect(undoImport).toHaveBeenCalledWith('imp-1');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(calls).toHaveLength(2);
    expect(runOf(hook).fixes).toEqual({});
    expect(runOf(hook).phase).toBe('undone');
    expect(errorToasts()).toEqual([]);
  });

  it('Undo waits for a pick on the wire before asking for the undo', async () => {
    let release = () => {};
    holdFixes = new Promise((resolve) => {
      release = resolve;
    });
    const hook = await importedWithProblems();
    vi.useFakeTimers();
    pickTopBoy(hook);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    vi.useRealTimers();
    await waitFor(() => expect(calls).toHaveLength(3));

    let undoing = Promise.resolve();
    act(() => {
      undoing = hook.result.current.confirmUndo();
    });
    // Feedback at once, the request only after the write has settled
    expect(runOf(hook).phase).toBe('undoing');
    await act(async () => {
      await Promise.resolve();
    });
    expect(undoImport).not.toHaveBeenCalled();

    await act(async () => {
      release();
      await undoing;
    });
    expect(undoImport).toHaveBeenCalledWith('imp-1');
    expect(errorToasts()).toEqual([]);
  });

  it('a pick asked for while Undo runs is not sent', async () => {
    const hook = await importedWithProblems();
    vi.useFakeTimers();
    act(() => {
      void hook.result.current.confirmUndo();
    });
    pickTopBoy(hook);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(calls).toHaveLength(2);
    expect(errorToasts()).toEqual([]);
  });

  it('Import another file cancels a pick still in its grace', async () => {
    const hook = await importedWithProblems();
    vi.useFakeTimers();
    pickTopBoy(hook);
    act(() => hook.result.current.anotherFile());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(calls).toHaveLength(2);
    expect(hook.result.current.state.step).toBe('upload');
    expect(leaveIsWarned()).toBe(false);
  });

  it('warns before leaving while a pick is unsent, not after', async () => {
    const hook = await importedWithProblems();
    expect(leaveIsWarned()).toBe(false);
    vi.useFakeTimers();
    pickTopBoy(hook);
    expect(leaveIsWarned()).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    vi.useRealTimers();
    await waitFor(() =>
      expect(runOf(hook).fixes['amb:top boy']).toMatchObject({
        status: 'sent',
      }),
    );
    expect(leaveIsWarned()).toBe(false);
  });

  it('undoes the last import from before a reload: asks, undoes, polls until done', async () => {
    vi.mocked(importStatus).mockResolvedValue({
      data: {
        lastImport: {
          createdAt: 1,
          importId: 'imp-0',
          undoRequestedAt: 2,
          written: 5,
        },
      },
      ok: true,
    });
    const hook = renderHook(() =>
      useImporter({ createdAt: 1, importId: 'imp-0', written: 5 }),
    );
    expect(hook.result.current.lastImport).toMatchObject({
      ask: false,
      phase: 'idle',
    });
    act(() => hook.result.current.askLastUndo(true));
    expect(hook.result.current.lastImport.ask).toBe(true);

    vi.useFakeTimers();
    await act(async () => {
      await hook.result.current.confirmLastUndo();
    });
    expect(undoImport).toHaveBeenCalledWith('imp-0');
    expect(hook.result.current.lastImport).toMatchObject({
      ask: false,
      phase: 'undoing',
    });

    vi.mocked(importStatus).mockResolvedValue({
      data: {
        lastImport: {
          createdAt: 1,
          importId: 'imp-0',
          undoneAt: 3,
          written: 5,
        },
      },
      ok: true,
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(hook.result.current.lastImport.phase).toBe('undone');
  });

  it('keeps the row when Undo fails, with a toast', async () => {
    vi.mocked(undoImport).mockResolvedValueOnce({
      error: 'failed',
      ok: false,
    });
    const hook = renderHook(() =>
      useImporter({ createdAt: 1, importId: 'imp-0', written: 5 }),
    );
    await act(async () => {
      await hook.result.current.confirmLastUndo();
    });
    expect(hook.result.current.lastImport.phase).toBe('idle');
    expect(errorToasts()).toHaveLength(1);
  });

  it('makes this tab’s import the last one after Import another file', async () => {
    const hook = await importedWithProblems();
    act(() => hook.result.current.anotherFile());
    expect(hook.result.current.lastImport.last).toMatchObject({
      importId: 'imp-1',
      written: 1,
    });
  });

  it('refreshes the page once when the import finishes, and again once undone (the nav line)', async () => {
    vi.mocked(importStatus).mockResolvedValue({
      data: { lastImport: null },
      ok: true,
    });
    const hook = await importedWithProblems();
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    await act(async () => {
      await hook.result.current.confirmUndo();
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(runOf(hook).phase).toBe('undone');
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('turns away a file that isn’t a CSV with a toast', () => {
    const hook = renderHook(() => useImporter());
    act(() =>
      hook.result.current.onFiles([
        new File(['x'], 'photo.png', { type: 'image/png' }),
      ]),
    );
    expect(showToast).toHaveBeenCalledWith({
      title: 'That isn’t a CSV file.',
      tone: 'error',
    });
    expect(hook.result.current.state.step).toBe('upload');
  });
});
