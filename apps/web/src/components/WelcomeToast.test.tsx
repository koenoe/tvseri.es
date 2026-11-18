// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import Toaster from '@/components/ui/toast/Toaster';
import { setCookie } from '@/test/setCookie';
import WelcomeToast from './WelcomeToast';

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  Element.prototype.setPointerCapture = () => {};
});

afterEach(() => {
  setCookie('__tvseries_welcome=; Max-Age=0; Path=/');
  router.push.mockReset();
});

const page = () =>
  render(
    <>
      <Toaster />
      <WelcomeToast />
    </>,
  );

describe('WelcomeToast', () => {
  it('welcomes a first sign-in once, with Pick a username → Settings → Profile', async () => {
    setCookie('__tvseries_welcome=1; Path=/');
    page();

    expect(await screen.findByText('Welcome')).toBeTruthy();
    // Read once: the cookie is gone, so the next page shows nothing
    expect(document.cookie).not.toContain('__tvseries_welcome');

    await act(() =>
      userEvent.click(screen.getByRole('button', { name: 'Pick a username' })),
    );
    expect(router.push).toHaveBeenCalledWith('/settings/profile');
  });

  it('waits for the page to finish loading, and keeps the cookie until then', async () => {
    setCookie('__tvseries_welcome=1; Path=/');
    const readyState = vi
      .spyOn(document, 'readyState', 'get')
      .mockReturnValue('interactive');
    page();
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    // Still streaming: no toast yet, and the welcome is still owed
    expect(screen.queryByText('Welcome')).toBeNull();
    expect(document.cookie).toContain('__tvseries_welcome');

    readyState.mockReturnValue('complete');
    act(() => {
      window.dispatchEvent(new Event('load'));
    });
    expect(await screen.findByText('Welcome')).toBeTruthy();
    expect(document.cookie).not.toContain('__tvseries_welcome');
    readyState.mockRestore();
    await act(() =>
      userEvent.click(screen.getByRole('button', { name: 'Dismiss' })),
    );
  });

  it('says nothing to a returning sign-in', async () => {
    page();
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(screen.queryByText('Welcome')).toBeNull();
  });
});
