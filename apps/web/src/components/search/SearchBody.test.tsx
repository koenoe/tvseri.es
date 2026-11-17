// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MarkingProvider from '@/lib/marking/MarkingProvider';
import type { SearchView } from '@/lib/search/searchView';
import type { SearchCell, SearchLayout } from '@/lib/search/sections';
import {
  INITIAL_SESSION,
  type SessionState,
  sessionView,
} from '@/lib/search/session';
import { BRE, NOTHING } from '@/lib/search/testData';

import SearchBody from './SearchBody';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: vi.fn(), push: vi.fn() }),
}));

const RECENT: SearchCell = {
  href: '/136315/the-bear',
  id: 136315,
  image: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/the-bear.jpg',
  key: 'show-136315',
  kind: 'show',
  name: 'The Bear',
};

const ignore = () => {};

/** The panel's body for a session state, as the overlay draws it. */
function draw(state: Partial<SessionState>, layout: SearchLayout = 'desktop') {
  const view = sessionView(
    { ...INITIAL_SESSION, ...state },
    { layout, recents: [RECENT] },
  );
  return render(
    <MarkingProvider>
      <SearchBody
        layout={layout}
        onChoose={ignore}
        onRetry={ignore}
        view={view}
      />
    </MarkingProvider>,
  );
}

/** The first query is out, nothing landed yet (the recents on screen) */
const FIRST_QUERY = {
  query: 'bre',
  requested: 'bre',
  status: 'pending',
} as const;

/** “bre” is shown, “breaking” is out */
const REFINE = {
  query: 'breaking',
  requested: 'breaking',
  results: BRE,
  shown: 'bre',
  status: 'pending',
} as const;

/** The desktop panel holds its max height, so rows arriving don't make it jump */
const heightLocked = () =>
  document.querySelector('[class*="md:h-[min("]') !== null;

const listbox = () => screen.getByRole('listbox', { name: 'Results' });
const isDimmed = (element: Element) => element.closest('.opacity-50') !== null;
const ghosts = (kind: 'person' | 'show') =>
  document.querySelectorAll(`[data-ghost="${kind}"]`);
const announcement = () => document.querySelector('[aria-live="polite"]');

describe('SearchBody while a request is out', () => {
  it('a request out under 250 ms changes nothing: the results stay at full strength', () => {
    draw(REFINE);

    expect(listbox().getAttribute('aria-busy')).toBe('false');
    expect(isDimmed(screen.getByRole('option', { name: /Breaking Bad/ }))).toBe(
      false,
    );
    expect(ghosts('show')).toHaveLength(0);
  });

  it('stalled: the results on screen fade to 50%, stay operable, and the list is busy', () => {
    draw({ ...REFINE, stalled: true });

    const first = screen.getByRole('option', { name: /Breaking Bad/ });
    expect(isDimmed(first)).toBe(true);
    expect(first.getAttribute('href')).toBe('/1396/breaking-bad');
    expect(listbox().getAttribute('aria-busy')).toBe('true');
    // nothing new is announced until the answer lands
    expect(announcement()?.textContent).toBe('8 series');
  });

  it('stalled on the first query: ghost rows replace the recents (8 posters, 4 people)', () => {
    draw({ ...FIRST_QUERY, stalled: true });

    expect(screen.queryByRole('group', { name: 'Recent' })).toBeNull();
    expect(ghosts('show')).toHaveLength(8);
    expect(ghosts('person')).toHaveLength(4);
    const shows = ghosts('show')[0];
    expect(shows?.closest('[aria-hidden="true"]')).not.toBeNull();
    // the ghosts are the placeholder: they don't dim
    expect(shows && isDimmed(shows)).toBe(false);
    expect(listbox().getAttribute('aria-busy')).toBe('true');
    expect(announcement()?.textContent).toBe('');
  });

  it('on a phone the ghosts are 6 posters (three across) and a strip of 4 people', () => {
    draw({ ...FIRST_QUERY, stalled: true }, 'phone');

    expect(ghosts('show')).toHaveLength(6);
    expect(ghosts('person')).toHaveLength(4);
  });

  it('not stalled on the first query: the recents stay', () => {
    draw(FIRST_QUERY);

    expect(screen.getByRole('group', { name: 'Recent' })).toBeTruthy();
    expect(ghosts('show')).toHaveLength(0);
  });

  it('stalled on a status line: the line fades too', () => {
    draw({
      query: 'zzqx ',
      requested: 'zzqx',
      results: NOTHING,
      shown: 'zzqx',
      stalled: true,
      status: 'pending',
    });

    expect(isDimmed(screen.getByText('Nothing for “zzqx”'))).toBe(true);
  });

  it('a failed request shows its line at full strength', () => {
    draw({
      query: 'boom',
      requested: 'boom',
      shown: 'boom',
      status: 'error',
    });

    expect(isDimmed(screen.getByRole('button', { name: 'Try again' }))).toBe(
      false,
    );
  });
});

describe('SearchBody height (desktop)', () => {
  it('grows to its max height from the first ghost and stays while it shows rows', () => {
    draw({ ...FIRST_QUERY, stalled: true });
    expect(heightLocked()).toBe(true);
  });

  it('with nothing found it is as tall as its one line', () => {
    draw({ results: NOTHING, shown: 'zzqx', status: 'ready' });
    expect(heightLocked()).toBe(false);
  });

  it('on the recents it is as tall as they are', () => {
    draw(FIRST_QUERY);

    expect(heightLocked()).toBe(false);
  });
});

describe('SearchBody: a member found by their handle', () => {
  const MEMBER: SearchView = {
    best: 'members',
    members: [{ id: '01JUNO', username: 'juno-tv' }],
    people: [],
    series: [],
  };

  it('draws the member as a chip under “Members”, linking to their profile, marked for Enter', () => {
    draw({
      query: '@juno-tv',
      requested: '@juno-tv',
      results: MEMBER,
      selected: 0,
      shown: '@juno-tv',
      status: 'ready',
    });

    const group = screen.getByRole('group', { name: 'Members' });
    const option = screen.getByRole('option', { name: /@juno-tv/ });
    expect(group.contains(option)).toBe(true);
    expect(option.getAttribute('href')).toBe('/u/juno-tv');
    expect(option.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('1 member')).toBeTruthy();
  });
});
