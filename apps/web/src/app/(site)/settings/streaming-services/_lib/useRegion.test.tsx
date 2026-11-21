// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useRegion } from './useRegion';

type Save = Readonly<{ code: string; answer: (ok: boolean) => Promise<void> }>;

const saves: Save[] = [];

vi.mock('@/lib/watchProviders/actions', () => ({
  updateCountry: (code: string) =>
    new Promise((resolve) => {
      saves.push({
        answer: async (ok) => {
          await act(async () => {
            resolve(ok ? { ok: true } : { error: 'failed', ok: false });
          });
        },
        code,
      });
    }),
}));
vi.mock('@/lib/region/useRegion', () => ({ refreshRegion: async () => {} }));
vi.mock('@/components/ui/toast/showToast', () => ({ showToast: () => {} }));

afterEach(() => {
  saves.length = 0;
});

const pickTwice = () => {
  const hook = renderHook(() => useRegion('GB'));
  act(() => hook.result.current.choose('NL', false));
  act(() => hook.result.current.choose('DE', false));
  const [older, newer] = saves;
  if (!older || !newer) {
    throw new Error('expected two saves');
  }
  return { hook, newer, older };
};

describe('useRegion: quick picks settle on the latest one', () => {
  it('an older save answering last does not win', async () => {
    const { hook, newer, older } = pickTwice();
    await newer.answer(true);
    await older.answer(true);
    expect(hook.result.current.region).toBe('DE');
  });

  it('a failed older save leaves the newer pick, and picking back still saves', async () => {
    const { hook, newer, older } = pickTwice();
    await older.answer(false);
    await newer.answer(true);
    expect(hook.result.current.region).toBe('DE');
    act(() => hook.result.current.choose('GB', false));
    expect(saves.at(-1)?.code).toBe('GB');
    await saves.at(-1)?.answer(true);
    expect(hook.result.current.region).toBe('GB');
  });

  it('the latest save failing goes back to the last one the server took', async () => {
    const { hook, newer, older } = pickTwice();
    await older.answer(true);
    await newer.answer(false);
    expect(hook.result.current.region).toBe('NL');
    act(() => hook.result.current.choose('DE', false));
    expect(saves.at(-1)?.code).toBe('DE');
  });
});
