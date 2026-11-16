import { describe, expect, it } from 'vitest';

import { createHeaderStore } from './store';

describe('header store', () => {
  it('remembers the previous mode, so only changes to or from the pill animate', () => {
    const store = createHeaderStore();
    store.getState().setMode('hidden');
    store.getState().setMode('floating');
    expect(store.getState()).toMatchObject({
      mode: 'floating',
      previousMode: 'hidden',
    });
  });

  it('resets to the static bar without an animation', () => {
    const store = createHeaderStore('floating');
    store.getState().setMode('hidden');
    store.getState().resetMode();
    expect(store.getState()).toMatchObject({
      mode: 'static',
      previousMode: 'static',
    });
  });

  it('shows the pill when focus moves into the hidden header', () => {
    const store = createHeaderStore('hidden');
    store.getState().revealOnFocus();
    expect(store.getState()).toMatchObject({
      mode: 'floating',
      previousMode: 'hidden',
    });
  });

  it('leaves the static bar alone on focus', () => {
    const store = createHeaderStore();
    store.getState().revealOnFocus();
    expect(store.getState().mode).toBe('static');
  });

  it('opens and closes the menu', () => {
    const store = createHeaderStore();
    store.getState().toggleMenu();
    expect(store.getState().menuOpen).toBe(true);
    store.getState().toggleMenu();
    expect(store.getState().menuOpen).toBe(false);
    store.getState().toggleMenu();
    store.getState().closeMenu();
    expect(store.getState().menuOpen).toBe(false);
  });

  it('keeps the mode the menu opened from (the pill comes back on close)', () => {
    const store = createHeaderStore('floating');
    store.getState().toggleMenu();
    store.getState().closeMenu();
    expect(store.getState().mode).toBe('floating');
  });
});
