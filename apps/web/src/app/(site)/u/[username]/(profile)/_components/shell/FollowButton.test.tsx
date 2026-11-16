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

const setFollowing = vi.fn();
const showToast = vi.fn();

vi.mock('../../_actions/follow', () => ({
  setFollowing: (...args: unknown[]) => setFollowing(...args),
}));
vi.mock('@/components/ui/toast/showToast', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));

afterEach(cleanup);

const settle = () => act(async () => {});

describe('FollowButton', () => {
  it('stays Following once the follow is saved', async () => {
    setFollowing.mockResolvedValue({ ok: true });
    render(
      <FollowButton initialFollowing={false} userId="u1" username="juno" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Follow' }));
    expect(screen.getByRole('button').textContent).toBe('Following');
    await settle();
    expect(setFollowing).toHaveBeenCalledWith('u1', true);
    expect(screen.getByRole('button').textContent).toBe('Following');
    expect(showToast).not.toHaveBeenCalled();
  });

  it('stays Follow once the unfollow is saved', async () => {
    setFollowing.mockResolvedValue({ ok: true });
    render(<FollowButton initialFollowing userId="u1" username="juno" />);
    fireEvent.click(screen.getByRole('button', { name: 'Following' }));
    await settle();
    expect(setFollowing).toHaveBeenCalledWith('u1', false);
    expect(screen.getByRole('button').textContent).toBe('Follow');
  });

  it('goes back and says so when the API refuses', async () => {
    setFollowing.mockResolvedValue({ ok: false });
    render(
      <FollowButton initialFollowing={false} userId="u1" username="juno" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Follow' }));
    await settle();
    expect(screen.getByRole('button').textContent).toBe('Follow');
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'error' }),
    );
  });

  it('says Follow back on a Circle row, then Following', async () => {
    setFollowing.mockResolvedValue({ ok: true });
    render(
      <FollowButton
        followLabel="Follow back"
        initialFollowing={false}
        size="circle"
        userId="u1"
        username="wren"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Follow back' }));
    expect(screen.getByRole('button').textContent).toBe('Following');
    await settle();
    expect(setFollowing).toHaveBeenCalledWith('u1', true);
    expect(screen.getByRole('button').textContent).toBe('Following');
  });
});
