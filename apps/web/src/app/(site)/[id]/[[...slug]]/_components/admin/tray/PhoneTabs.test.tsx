// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PhoneTabs from './PhoneTabs';
import type { Tab } from './trayState';
import type { TrayModel } from './useTray';

const animate = vi.fn();

beforeEach(() => {
  animate.mockReset();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches: false,
      removeEventListener: () => undefined,
    })),
  );
  HTMLElement.prototype.animate = animate;
});

const tabs = (tab: Tab) => {
  const model = {
    images: null,
    setTab: () => undefined,
    state: { tab },
  } as unknown as TrayModel;
  return <PhoneTabs ids="tray" model={model} />;
};

describe('the tray’s phone tabs', () => {
  it('draw the open tab’s fill in place', () => {
    render(tabs('backdrop'));
    const open = screen.getByRole('tab', { name: 'Backdrop' });
    expect(open.getAttribute('aria-selected')).toBe('true');
    expect(animate).not.toHaveBeenCalled();
  });

  it('glide the fill to the tab chosen', () => {
    const { rerender } = render(tabs('backdrop'));
    rerender(tabs('title'));
    const [, options] = animate.mock.calls[0] ?? [];
    expect(options).toMatchObject({ pseudoElement: '::before' });
  });
});
