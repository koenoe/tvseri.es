// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('@/components/ui/toast/showToast', () => ({ showToast }));

import CopyButton, { COPIED_HOLD_MS } from './CopyButton';

const show = (ui: ReactElement) =>
  render(
    <LazyMotion features={domAnimation} strict>
      {ui}
    </LazyMotion>,
  );

const press = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button'));
  });

/** The button says it copied (its name is the word it shows) */
const confirmed = () =>
  screen.queryByRole('button', { name: 'Copied' }) !== null;

afterEach(() => {
  vi.useRealTimers();
});

let writeText: ReturnType<typeof vi.fn>;
beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

describe('CopyButton', () => {
  it('copies, toasts, and says Copied for a moment', async () => {
    // only the hold's clock is faked: Motion's frames stay real
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    show(
      <CopyButton copied="Copied the link" text="https://x.test">
        Copy
      </CopyButton>,
    );
    expect(confirmed()).toBe(false);
    await press();
    expect(writeText).toHaveBeenCalledWith('https://x.test');
    expect(showToast).toHaveBeenLastCalledWith({ title: 'Copied the link' });
    expect(confirmed()).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(COPIED_HOLD_MS);
    });
    expect(confirmed()).toBe(false);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('copies text it fetches on the press, and nothing when there is none', async () => {
    const text = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce('https://plex.test/abc')
      .mockResolvedValueOnce(null);
    show(
      <CopyButton copied="Copied your Plex webhook URL" text={text}>
        Copy
      </CopyButton>,
    );
    await press();
    expect(writeText).toHaveBeenCalledWith('https://plex.test/abc');
    writeText.mockClear();
    showToast.mockClear();
    await press();
    // the fetch said why itself; no copy, no second toast
    expect(writeText).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('says it couldn’t copy, and keeps the copy icon', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    show(
      <CopyButton copied="Copied" failed="Couldn’t copy the code." text="4829">
        Copy
      </CopyButton>,
    );
    await press();
    expect(showToast).toHaveBeenLastCalledWith({
      title: 'Couldn’t copy the code.',
      tone: 'error',
    });
    expect(confirmed()).toBe(false);
  });

  it('holds one width: both words share one place, the one not said hidden', async () => {
    show(
      <CopyButton copied="Copied the link" text="https://x.test">
        Copy link
      </CopyButton>,
    );
    const words = () =>
      Array.from(screen.getByRole('button').querySelectorAll('span > span'));
    expect(words().map((word) => word.textContent)).toEqual([
      'Copy link',
      'Copied',
    ]);
    expect(words()[1]?.getAttribute('aria-hidden')).toBe('true');
    await press();
    await vi.waitFor(() =>
      expect(words()[0]?.getAttribute('aria-hidden')).toBe('true'),
    );
    expect(words()[1]?.getAttribute('aria-hidden')).toBeNull();
  });
});
