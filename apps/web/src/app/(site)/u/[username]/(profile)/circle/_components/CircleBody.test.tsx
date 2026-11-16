// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import type { CirclePeople, CircleRow } from '@tvseri.es/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FollowItem } from '@/lib/profile/views';

import CircleGhost from './CircleGhost';
import MatchKey from './MatchKey';
import OwnerCircle from './OwnerCircle';
import VisitorCircle from './VisitorCircle';

vi.mock('../../_actions/follow', () => ({ setFollowing: vi.fn() }));

afterEach(cleanup);

const row = (
  username: string,
  overrides: Partial<CircleRow> = {},
): CircleRow => ({
  following: true,
  followsYou: false,
  id: `u-${username}`,
  match: { arc: 64, level: 'high', sharedCount: 19, sharedShows: [] },
  username,
  watching: null,
  ...overrides,
});

const people = (overrides: Partial<CirclePeople>): CirclePeople => ({
  capped: false,
  followerCount: 6,
  followers: [],
  following: [],
  followingCount: 8,
  ...overrides,
});

const names = (list: HTMLElement) =>
  within(list)
    .getAllByRole('link')
    .map((link) => link.textContent);

describe('your own Circle', () => {
  it('lists who you follow in the API’s order, then who to follow back', () => {
    render(
      <OwnerCircle
        people={people({
          followers: [row('wren', { following: false, followsYou: true })],
          following: [row('edw1n'), row('margaux'), row('merelr')],
        })}
      />,
    );
    const following = screen.getByRole('region', { name: 'You follow' });
    expect(names(following)).toEqual(['edw1n', 'margaux', 'merelr']);
    expect(following.textContent).toContain('8');
    const followers = screen.getByRole('region', { name: 'Follows you' });
    expect(names(followers)).toEqual(['wren']);
    expect(within(followers).getByRole('button').textContent).toBe(
      'Follow back',
    );
  });

  it('following nobody: one calm card, then the two who follow you', () => {
    render(
      <OwnerCircle
        people={people({
          followerCount: 2,
          followers: [
            row('wren', { following: false, followsYou: true }),
            row('juno', { following: false, followsYou: true }),
          ],
          followingCount: 0,
        })}
      />,
    );
    const following = screen.getByRole('region', { name: 'You follow' });
    expect(
      within(following).getByText('You don’t follow anyone yet'),
    ).toBeTruthy();
    expect(
      within(following).getByText(
        'Follow someone from their profile; the two people below already follow you.',
      ),
    ).toBeTruthy();
    expect(within(following).queryByRole('list')).toBeNull();
    expect(names(screen.getByRole('region', { name: 'Follows you' }))).toEqual([
      'wren',
      'juno',
    ]);
  });

  it('drops Follows you when everyone who follows you is followed back', () => {
    render(<OwnerCircle people={people({ following: [row('edw1n')] })} />);
    expect(screen.queryByRole('region', { name: 'Follows you' })).toBeNull();
    expect(
      screen.queryByText('Showing your 100 most recent follows'),
    ).toBeNull();
  });

  it('says so when rows were left out past 100', () => {
    render(
      <OwnerCircle
        people={people({ capped: true, following: [row('edw1n')] })}
      />,
    );
    expect(
      screen.getByText('Showing your 100 most recent follows'),
    ).toBeTruthy();
  });
});

describe('How a match is made (PGFinal 5 sidebar)', () => {
  it('states the weights and lists the six levels, strongest first', () => {
    render(<MatchKey />);
    const key = screen.getByRole('region', { name: 'How a match is made' });
    expect(key.textContent).toContain(
      'Series you both favourited count 3, both finished 2, any other shared series 1. Under 5 shared series there is no level yet.',
    );
    expect(
      within(key)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Super', 'Very high', 'High', 'Medium', 'Low', 'Very low']);
  });
});

const person = (
  username: string,
  overrides: Partial<FollowItem> = {},
): FollowItem => ({
  followerCount: 1,
  followingCount: 1,
  id: `u-${username}`,
  isFollower: false,
  isFollowing: false,
  isMe: false,
  username,
  watching: null,
  ...overrides,
});

describe('someone else’s Circle', () => {
  it('lists who they follow and who follows them, with their counts', () => {
    render(
      <VisitorCircle
        counts={{ followers: 1, following: 2 }}
        lists={{
          followers: {
            items: [person('alex', { isMe: true })],
            nextCursor: null,
          },
          following: {
            items: [
              person('alex', { isMe: true }),
              person('margaux', { isFollower: true, isFollowing: true }),
            ],
            nextCursor: null,
          },
        }}
        username="edw1n"
      />,
    );
    const follows = screen.getByRole('region', { name: 'edw1n follows' });
    expect(names(follows)).toEqual(['alex', 'margaux']);
    expect(follows.textContent).toContain('2');
    const followers = screen.getByRole('region', { name: 'Follows edw1n' });
    expect(names(followers)).toEqual(['alex']);
    expect(within(followers).getAllByText('It’s you').length).toBeGreaterThan(
      0,
    );
  });

  it('says a list is empty instead of leaving a hole', () => {
    render(
      <VisitorCircle
        counts={null}
        lists={{
          followers: { items: [], nextCursor: null },
          following: { items: [], nextCursor: null },
        }}
        username="edw1n"
      />,
    );
    expect(screen.getByText('edw1n doesn’t follow anyone yet')).toBeTruthy();
    expect(screen.getByText('Nobody follows edw1n yet')).toBeTruthy();
  });
});

describe('the Circle while it loads', () => {
  const bars = (row: Element) => row.querySelectorAll('.rounded-6').length;

  it('is five ghost rows, hidden from assistive tech', () => {
    const { container } = render(<CircleGhost owner />);
    const list = container.querySelector('ul');
    expect(list?.getAttribute('aria-hidden')).toBe('true');
    expect(list?.children).toHaveLength(5);
  });

  it('draws three lines for your own rows and two for a visitor’s', () => {
    const owner = render(<CircleGhost owner />);
    expect(bars(owner.container.querySelector('li') as Element)).toBe(3);
    cleanup();
    const visitor = render(<CircleGhost owner={false} />);
    expect(bars(visitor.container.querySelector('li') as Element)).toBe(2);
  });
});
