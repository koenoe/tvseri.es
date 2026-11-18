// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HeaderStoreProvider, useHeaderStore } from './HeaderStoreProvider';
import type { HeaderMode } from './headerMode';
import RootHeaderMode from './RootHeaderMode';

let setMode: (mode: HeaderMode) => void = () => {};

function Remote() {
  setMode = useHeaderStore((state) => state.setMode);
  return null;
}

const rootMode = () => document.documentElement.dataset.headerMode;

describe('RootHeaderMode', () => {
  it('mirrors the header’s look on <html> and lets go of it on unmount', () => {
    const { unmount } = render(
      <HeaderStoreProvider>
        <Remote />
        <RootHeaderMode />
      </HeaderStoreProvider>,
    );
    expect(rootMode()).toBe('static');

    act(() => setMode('hidden'));
    expect(rootMode()).toBe('hidden');
    act(() => setMode('floating'));
    expect(rootMode()).toBe('floating');

    unmount();
    expect(rootMode()).toBeUndefined();
  });
});
