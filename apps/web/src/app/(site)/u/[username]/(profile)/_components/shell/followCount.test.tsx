// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FollowButton from './FollowButton';
import FollowersCount from './FollowersCount';
import { recordFollow } from './followCount';

const setFollowing = vi.fn();

vi.mock('../../_actions/follow', () => ({
  setFollowing: (...args: unknown[]) => setFollowing(...args),
}));
vi.mock('@/components/ui/toast/showToast', () => ({ showToast: vi.fn() }));

afterEach(cleanup);

describe('FollowersCount', () => {
  it('counts a follow at once, and the server’s count once it moves', () => {
    const { rerender } = render(
      <FollowersCount followers={0} following={2} userId="u-follow-1" />,
    );
    expect(screen.getByText('0 followers · 2 following')).toBeTruthy();

    act(() => recordFollow('u-follow-1', 1));
    expect(screen.getByText('1 follower · 2 following')).toBeTruthy();

    // The refresh came back before the stream: still the stale count
    rerender(
      <FollowersCount followers={0} following={2} userId="u-follow-1" />,
    );
    expect(screen.getByText('1 follower · 2 following')).toBeTruthy();

    // The stream caught up: the server's count, not counted twice
    rerender(
      <FollowersCount followers={1} following={2} userId="u-follow-1" />,
    );
    expect(screen.getByText('1 follower · 2 following')).toBeTruthy();
  });

  it('takes an unfollow back off', () => {
    render(<FollowersCount followers={5} following={0} userId="u-follow-2" />);
    act(() => recordFollow('u-follow-2', -1));
    expect(screen.getByText('4 followers · 0 following')).toBeTruthy();
  });

  describe('with the Follow button', () => {
    const draw = (userId: string, followers: number) => (
      <>
        <FollowButton
          initialFollowing={false}
          userId={userId}
          username="juno"
        />
        <FollowersCount followers={followers} following={0} userId={userId} />
      </>
    );

    it('counts a confirmed follow at once and keeps the button confirmed', async () => {
      setFollowing.mockResolvedValue({ ok: true });
      render(draw('u-btn-1', 3));
      fireEvent.click(screen.getByRole('button', { name: 'Follow' }));
      await act(async () => {});
      expect(screen.getByText('4 followers · 0 following')).toBeTruthy();
      expect(screen.getByRole('button').textContent).toBe('Following');
    });

    it('changes nothing when the follow is refused', async () => {
      setFollowing.mockResolvedValue({ ok: false });
      render(draw('u-btn-2', 3));
      fireEvent.click(screen.getByRole('button', { name: 'Follow' }));
      await act(async () => {});
      expect(screen.getByText('3 followers · 0 following')).toBeTruthy();
      expect(screen.getByRole('button').textContent).toBe('Follow');
    });
  });
});
