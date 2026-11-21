// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LensPanel from './LensPanel';
import { LensProvider, useLensStore } from './LensProvider';

let select: (lens: 'duration' | 'decade') => void = () => {};
function GrabStore() {
  const store = useLensStore();
  select = (lens) => act(() => store.getState().selectLens(lens));
  return null;
}

const renderPanels = () =>
  render(
    <LensProvider>
      <GrabStore />
      <LensPanel lens="duration">
        <a href="/duration">
          <span>duration tile</span>
        </a>
      </LensPanel>
      <LensPanel lens="decade">
        <a href="/decade">
          <span>decade tile</span>
        </a>
      </LensPanel>
    </LensProvider>,
  );

const panel = (lens: string) =>
  document.getElementById(`lens-${lens}`) as HTMLElement;
const fading = (lens: string) => panel(lens).hasAttribute('data-fade');

/** A tile's own rise ending (or a fade inside it, `from: 'inside'`) */
function risen(lens: string, from: 'tile' | 'inside' = 'tile') {
  const tile = screen.getByText(`${lens} tile`);
  const target = from === 'tile' ? tile.parentElement! : tile;
  fireEvent(
    target,
    Object.assign(new Event('transitionend', { bubbles: true }), {
      propertyName: 'opacity',
    }),
  );
}

describe('LensPanel', () => {
  it('plays nothing on the first paint', () => {
    renderPanels();
    expect(fading('duration')).toBe(false);
    expect(fading('decade')).toBe(false);
  });

  it('fades the switched-to grid up until its tiles have risen, so Back doesn’t replay it', () => {
    renderPanels();
    select('decade');
    expect(fading('decade')).toBe(true);
    risen('decade', 'inside');
    expect(fading('decade')).toBe(true);
    risen('decade');
    // shown again by Back, the grid has nothing switched on to replay
    expect(fading('decade')).toBe(false);
  });

  it('fades a grid up again each time the viewer comes back to it', () => {
    renderPanels();
    select('decade');
    risen('decade');
    select('duration');
    expect(fading('duration')).toBe(true);
    risen('duration');
    select('decade');
    expect(fading('decade')).toBe(true);
  });
});
