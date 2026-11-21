// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PlexPanel from './PlexPanel';

vi.mock('../actions', () => ({
  createPlexUrl: vi.fn(),
  disconnectPlex: vi.fn(),
  revealPlexUrl: vi.fn(),
  updatePlex: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/components/ui/toast/showToast', () => ({ showToast: vi.fn() }));

/** The accordion the card needs: the body always shown, the toggle inert */
vi.mock('./AppsAccordion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./AppsAccordion')>()),
  AppBody: ({ children }: Readonly<{ children: ReactNode }>) => (
    <div>{children}</div>
  ),
  AppToggle: () => (
    <button id="plex-toggle" type="button">
      Hide Plex
    </button>
  ),
}));

afterEach(cleanup);

const panel = (connected: boolean) => (
  <PlexPanel
    account={null}
    connected={connected}
    hasUrl={connected}
    lastReceivedAt={null}
    onlyAccountId={null}
    paused={false}
    prefix="https://api.tvseri.es/webhooks/plex?token="
    scrobbles={null}
    urlWorks
  />
);

/** The body the card swaps (setup steps, or the connected parts) */
const bodyOf = (text: RegExp) =>
  screen.getAllByText(text)[0]?.closest<HTMLElement>('[style]') ?? null;

describe('PlexPanel', () => {
  it('draws its first body at once', () => {
    render(panel(false));
    const setup = screen.getByRole('button', { name: /Create/ });
    expect(setup.closest<HTMLElement>('[style*="opacity: 0"]')).toBeNull();
  });

  it('swaps the setup for the connected body as the streaming services swap theirs', () => {
    const { rerender } = render(panel(false));
    rerender(panel(true));
    // the connected body rises in from SwapIn's start
    expect(bodyOf(/Disconnect/)?.style.opacity).toBe('0');
  });
});
