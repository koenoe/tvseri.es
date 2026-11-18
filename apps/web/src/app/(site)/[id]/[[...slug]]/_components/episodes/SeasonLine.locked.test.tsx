// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MarkingProvider from '@/lib/marking/MarkingProvider';

import { ViewerLocked } from '../../_lib/viewerUnavailable';
import { ClockProvider } from './clock';
import type { MarkedEpisode } from './marks';
import SeasonLine from './SeasonLine';
import { season } from './testData';

const openUpTo = vi.hoisted(() => vi.fn());
vi.mock('../../_lib/dialogs', async (original) => ({
  ...(await original<typeof import('../../_lib/dialogs')>()),
  openUpTo,
}));

const episodes = season(1, 2);
const marked: ReadonlyArray<MarkedEpisode> = [
  { episode: episodes[0]!, mark: 'next', record: undefined },
  { episode: episodes[1]!, mark: 'open', record: undefined },
];

function render(locked: boolean) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <MarkingProvider>
        <ClockProvider>
          <ViewerLocked value={locked}>
            <SeasonLine
              episodes={episodes}
              marked={marked}
              seasonNumber={1}
              seriesId={1}
            />
          </ViewerLocked>
        </ClockProvider>
      </MarkingProvider>,
    );
  });
  const line = container.querySelector<HTMLElement>('[role="group"]');
  if (!line) {
    throw new Error('no season line');
  }
  return { line, unmount: () => act(() => root.unmount()) };
}

const pressEnter = (line: HTMLElement) =>
  act(() => {
    line.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
    );
  });

describe('Enter on the season line', () => {
  afterEach(() => {
    openUpTo.mockClear();
    document.body.innerHTML = '';
  });

  it('opens "I’m up to…"', () => {
    const { line, unmount } = render(false);
    pressEnter(line);
    expect(openUpTo).toHaveBeenCalledOnce();
    expect(line.getAttribute('aria-keyshortcuts')).toBe('Enter');
    unmount();
  });

  it('does nothing while the viewer’s progress is locked', () => {
    const { line, unmount } = render(true);
    pressEnter(line);
    expect(openUpTo).not.toHaveBeenCalled();
    expect(line.hasAttribute('aria-keyshortcuts')).toBe(false);
    unmount();
  });
});
