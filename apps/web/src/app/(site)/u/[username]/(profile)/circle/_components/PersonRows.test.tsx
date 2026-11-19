// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import type { CircleRow } from '@tvseri.es/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FollowItem } from '@/lib/profile/views';

import OwnerPersonRow from './OwnerPersonRow';
import VisitorPersonRow from './VisitorPersonRow';

vi.mock('../../_actions/follow', () => ({ setFollowing: vi.fn() }));

afterEach(cleanup);

const edw1n: CircleRow = {
  following: true,
  followsYou: true,
  id: 'u-edw1n',
  match: {
    level: 'super',
    sharedCount: 34,
    sharedShows: [
      { id: 1, relation: 'both-favourite', title: 'The Pitt' },
      { id: 2, relation: 'both-watching', title: 'Severance' },
      { id: 3, relation: 'both-finished', title: 'Andor' },
    ],
  },
  username: 'edw1n',
  watching: { seriesId: 9, slug: 'frieren', title: 'Frieren' },
};

const juno: CircleRow = {
  following: false,
  followsYou: true,
  id: 'u-juno',
  match: { level: null, sharedCount: 3, sharedShows: [] },
  username: 'juno',
  watching: null,
};

const renderRow = (row: CircleRow) =>
  render(
    <ul>
      <OwnerPersonRow row={row} />
    </ul>,
  );

describe('a row on your own Circle', () => {
  it('shows the name, Follows you, the shared count, the level with its reason, what they watch and Following', () => {
    renderRow(edw1n);
    const row = screen.getByRole('listitem');
    // the count is words and the meter is a picture beside the level word
    expect(within(row).queryByRole('img')).toBeNull();
    expect(within(row).getByText('34 shared series')).toBeTruthy();
    expect(
      within(row).getByRole('link', { name: 'edw1n' }).getAttribute('href'),
    ).toBe('/u/edw1n');
    // beside the name from md, at the end of the button's row on a phone (one shows)
    expect(within(row).getAllByText('Follows you')).toHaveLength(2);
    expect(within(row).getByText('Super match')).toBeTruthy();
    expect(
      within(row).getByText('You both love The Pitt and watch Severance'),
    ).toBeTruthy();
    expect(row.textContent).toContain('WatchingFrieren');
    expect(within(row).getByRole('button').textContent).toBe('Following');
  });

  it('leaves out posters and New to you', () => {
    renderRow(edw1n);
    const row = screen.getByRole('listitem');
    expect(row.querySelector('img')).toBeNull();
    expect(row.textContent).not.toContain('New to you');
    // the name is the row's only link: one tap target into their profile
    expect(within(row).getAllByRole('link')).toHaveLength(1);
  });

  it('offers Follow back to someone who follows you, with no level yet', () => {
    renderRow(juno);
    const row = screen.getByRole('listitem');
    expect(within(row).getByRole('button').textContent).toBe('Follow back');
    expect(within(row).getByText('No level yet')).toBeTruthy();
    expect(
      within(row).getByText('Not enough shared yet: 3 series'),
    ).toBeTruthy();
    expect(
      within(row).getByText('Not watching anything right now'),
    ).toBeTruthy();
    expect(within(row).getByText('3 shared series')).toBeTruthy();
  });

  it('moves Follows you to the end of the button’s row on a phone, so the name and level line keep their width', () => {
    renderRow(edw1n);
    const name = screen.getByRole('link', { name: 'edw1n' });
    const [besideName, byButton] = screen.getAllByText('Follows you');
    expect(besideName?.parentElement).toBe(name.parentElement);
    expect(besideName?.className).toContain('max-md:hidden');
    const buttonCell = screen.getByRole('button').parentElement;
    expect(byButton?.parentElement).toBe(buttonCell);
    expect(buttonCell?.lastElementChild).toBe(byButton);
    expect(byButton?.className).toContain('ml-auto');
    expect(byButton?.className).toContain('md:hidden');
    expect(byButton?.className).not.toContain('max-md:hidden');
    const levelLine = screen.getByText('Super match').parentElement;
    expect(levelLine?.textContent).not.toContain('Follows you');
  });

  it('has no Follows you tag for someone who doesn’t follow you', () => {
    renderRow({ ...edw1n, followsYou: false });
    expect(screen.queryByText('Follows you')).toBeNull();
  });

  it('leaves the tag off a follower you don’t follow back: their section says it', () => {
    renderRow({ ...edw1n, following: false, followsYou: true });
    expect(screen.queryByText('Follows you')).toBeNull();
    expect(screen.getByRole('button').textContent).toBe('Follow back');
  });
});

const person = (overrides: Partial<FollowItem>): FollowItem => ({
  followerCount: 1,
  followingCount: 2,
  id: 'u-margaux',
  isFollower: true,
  isFollowing: true,
  isMe: false,
  username: 'margaux',
  watching: { seriesId: 7, slug: 'borgen', title: 'Borgen' },
  ...overrides,
});

describe('a row on someone else’s Circle', () => {
  it('shows your relation, what they watch and Follow, with no match level', () => {
    render(
      <ul>
        <VisitorPersonRow person={person({})} />
      </ul>,
    );
    const row = screen.getByRole('listitem');
    expect(within(row).getByText('You follow')).toBeTruthy();
    expect(within(row).getByText('Follows you')).toBeTruthy();
    expect(row.textContent).toContain('WatchingBorgen');
    expect(within(row).getByRole('button').textContent).toBe('Following');
    expect(row.textContent).not.toContain('shared series');
    expect(within(row).queryByRole('img')).toBeNull();
    expect(row.textContent).not.toContain('New to you');
  });

  it('says It’s you on yourself, without a Follow button', () => {
    render(
      <ul>
        <VisitorPersonRow
          person={person({ id: 'u-alex', isMe: true, username: 'alex' })}
        />
      </ul>,
    );
    const row = screen.getByRole('listitem');
    // beside the name, and in the button's line on a phone (one shows)
    expect(within(row).getAllByText('It’s you')).toHaveLength(2);
    expect(within(row).queryByText('You follow')).toBeNull();
    expect(within(row).queryByRole('button')).toBeNull();
  });

  it('offers Follow to someone you don’t follow', () => {
    render(
      <ul>
        <VisitorPersonRow
          person={person({ isFollower: false, isFollowing: false })}
        />
      </ul>,
    );
    expect(screen.getByRole('button').textContent).toBe('Follow');
  });
});
