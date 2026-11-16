// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PHONE_MOTION } from '@/components/ui/dialog/dialogMotion';

import type { LandscapeShow } from '../_data/landscape';
import DecadeLandscape from './DecadeLandscape';
import DecadeSheet from './DecadeSheet';

const shell = vi.hoisted(() => vi.fn());

const noop = () => {};

/** Signed out: the controls draw the pair (mocked here anyway) */
const states = Promise.resolve(null);

vi.mock('./DecadeCard', () => ({
  DecadeCardActions: () => null,
  DecadeCardText: () => null,
  default: () => null,
}));
vi.mock('./TreemapTile', () => ({ default: () => null }));
vi.mock('@/components/ui/dialog/ModalShell', () => ({
  default: (props: Readonly<{ open: boolean }>) => {
    shell(props);
    return props.open ? <div role="dialog">sheet</div> : null;
  },
}));

const show = (id: number, title: string): LandscapeShow => ({
  backdrop: null,
  bar: 100,
  cell: {
    height: 1,
    left: 0,
    tileWidth: 1,
    top: 0,
    votesLine: false,
    width: 1,
  },
  id,
  kicker: 'Most rated of the decade',
  length: null,
  network: null,
  reason: '',
  slug: title.toLowerCase(),
  title,
  votes: '24,000',
  year: 2011,
});

describe('DecadeLandscape', () => {
  it('fetches the phone sheet’s code at idle on a phone, never drawing it before a tap', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.stubGlobal('requestIdleCallback', (run: () => void) => {
      run();
      return 1;
    });
    vi.stubGlobal('cancelIdleCallback', () => {});
    const { unmount } = render(
      <DecadeLandscape shows={[show(1, 'Dark')]} states={states} />,
    );
    expect(shell).not.toHaveBeenCalled();
    // the idle wait is cancelled on unmount, while the stubs are still there
    unmount();
    vi.unstubAllGlobals();
  });

  it('loads the phone sheet only once a row is tapped', async () => {
    render(
      <DecadeLandscape
        shows={[show(1, 'Dark'), show(2, 'Fargo')]}
        states={states}
      />,
    );
    expect(shell).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^2\. Fargo/ }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });
});

describe('DecadeSheet', () => {
  it('slides up as the shared phone sheet (PHONE_MOTION)', () => {
    render(
      <DecadeSheet
        onOpenChange={noop}
        open
        show={show(1, 'Dark')}
        states={states}
      />,
    );
    expect(shell).toHaveBeenLastCalledWith(
      expect.objectContaining({ motion: PHONE_MOTION }),
    );
  });
});
