import { describe, expect, it, vi } from 'vitest';

import { answerPaused, MAX_PAUSED } from './setPaused';

const ok = { data: undefined, ok: true } as const;
const failed = { error: 'failed', ok: false } as const;

describe('answerPaused', () => {
  it('sends one request per show, in order, with the choice', async () => {
    const update = vi.fn().mockResolvedValue(ok);
    const result = await answerPaused([1, 2, 3], 'hide', update);
    expect(update.mock.calls).toEqual([
      [1, { paused: 'hide' }],
      [2, { paused: 'hide' }],
      [3, { paused: 'hide' }],
    ]);
    expect(result).toEqual({ done: [1, 2, 3], ok: true });
  });

  it('reports the shows the API refused so they can come back', async () => {
    const update = vi
      .fn()
      .mockResolvedValueOnce(ok)
      .mockResolvedValueOnce(failed)
      .mockRejectedValueOnce(new Error('network'));
    const result = await answerPaused([1, 2, 3], 'keep', update);
    expect(result).toEqual({ done: [1], ok: false });
  });

  it('sends a Hide all of exactly the cap', async () => {
    const update = vi.fn().mockResolvedValue(ok);
    const all = Array.from({ length: MAX_PAUSED }, (_, i) => i + 1);
    expect(await answerPaused(all, 'hide', update)).toEqual({
      done: all,
      ok: true,
    });
    expect(update).toHaveBeenCalledTimes(MAX_PAUSED);
  });

  it('sends nothing for too many or invalid ids', async () => {
    const update = vi.fn();
    const many = Array.from({ length: MAX_PAUSED + 1 }, (_, i) => i + 1);
    expect(await answerPaused(many, 'hide', update)).toEqual({
      done: [],
      ok: false,
    });
    expect(await answerPaused([0, -1], 'hide', update)).toEqual({
      done: [],
      ok: false,
    });
    expect(update).not.toHaveBeenCalled();
  });
});
