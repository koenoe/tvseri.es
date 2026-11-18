// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import { setCookie } from '@/test/setCookie';
import { useIsSignedIn } from './hooks';
import MarkingProvider from './MarkingProvider';

/** A Library's worth of tiles that each ask the viewer's library */
const TILES = Array.from({ length: 300 }, (_, index) => index + 1);

function SignedInBadge() {
  return <span>{useIsSignedIn() ? 'in' : 'out'}</span>;
}

afterEach(() => {
  setCookie('__tvseries_user=; Max-Age=0; Path=/');
});

describe('300 tiles asking the library', () => {
  // per-tile subscriptions would add 301 listeners (as many on
  // `cookieStore`) and read the cookie 903 times
  it('add one pair of window listeners and read the cookie once, not per tile', () => {
    setCookie('__tvseries_user=nina; Path=/');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const added = vi.spyOn(window, 'addEventListener');
    const cookie = vi.spyOn(document, 'cookie', 'get');

    render(
      <MarkingProvider>
        {TILES.map((id) => (
          <WatchedOverlay id={id} key={id} />
        ))}
        <SignedInBadge />
      </MarkingProvider>,
    );

    const listeners = added.mock.calls.filter(
      ([type]) => type === 'tvseries:display-cookie',
    );
    expect(listeners).toHaveLength(1);
    expect(cookie.mock.calls.length).toBeLessThanOrEqual(2);
    // one library request for the page
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
