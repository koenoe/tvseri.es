// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * In `next dev` a hot reload can evaluate this module again while
 * the root layout still renders the earlier copy of the provider; hooks
 * from the new copy would then find no provider and every render of the
 * series page would throw. The provider and the hooks must meet through one context per
 * page, however many times the module is evaluated.
 */
describe('the marking context across module copies', () => {
  it('a hook from a fresh copy of the module reads the provider of the first', async () => {
    const first = await import('./MarkingProvider');
    vi.resetModules();
    const second = await import('./MarkingProvider');
    expect(second).not.toBe(first);

    function Reader() {
      const store = second.useMarkingStoreApi();
      return <span>{typeof store.getState === 'function' ? 'store' : ''}</span>;
    }
    render(
      <first.default>
        <Reader />
      </first.default>,
    );
    expect(screen.getByText('store')).toBeTruthy();
  });

  it('still refuses a hook with no provider at all', async () => {
    const { useMarkingStoreApi } = await import('./MarkingProvider');
    function Reader() {
      useMarkingStoreApi();
      return null;
    }
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Reader />)).toThrow(/Marking hooks need/);
  });
});
