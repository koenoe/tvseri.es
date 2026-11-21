// @vitest-environment jsdom
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LensProvider, useLensStore } from './LensProvider';
import LensRowSlot from './LensRowSlot';

let toggle: () => void = () => {};
function GrabStore() {
  const store = useLensStore();
  toggle = () => act(() => store.getState().toggleRow('short'));
  return null;
}

const renderSlot = () =>
  render(
    <LensProvider>
      <GrabStore />
      <LensRowSlot row="short">
        <section>short row</section>
      </LensRowSlot>
    </LensProvider>,
  );

const slot = () => document.getElementById('short-row');
const fading = () => slot()?.hasAttribute('data-fade') ?? false;

/** The row's own rise ending (or a fade inside it, `from: 'inside'`) */
function risen(from: 'row' | 'inside' = 'row') {
  const row = slot()?.firstElementChild as HTMLElement;
  const target = from === 'row' ? row : (row.firstElementChild as HTMLElement);
  fireEvent(
    target,
    Object.assign(new Event('transitionend', { bubbles: true }), {
      propertyName: 'opacity',
    }),
  );
}

describe('LensRowSlot', () => {
  it('draws nothing until its tile opens it', () => {
    renderSlot();
    expect(slot()).toBeNull();
  });

  it('rises in when opened, until it has risen, so Back doesn’t replay it', () => {
    renderSlot();
    toggle();
    expect(fading()).toBe(true);
    risen('inside');
    expect(fading()).toBe(true);
    risen();
    // shown again by Back, the row has nothing switched on to replay
    expect(fading()).toBe(false);
  });

  it('rises in again each time it is opened', () => {
    renderSlot();
    toggle();
    risen();
    toggle();
    expect(slot()).toBeNull();
    toggle();
    expect(fading()).toBe(true);
  });
});
