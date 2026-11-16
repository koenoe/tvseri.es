import { describe, expect, it } from 'vitest';

import { initialTrayState, isLocked, trayReducer } from './trayState';

const BASE = { backdrop: '/b1.jpg', title: '/l1.png' };
const ready = initialTrayState;

describe('trayReducer', () => {
  it('starts the first pick from what visitors see, later ones from the pick', () => {
    const first = trayReducer(ready, {
      backdrop: '/b2.jpg',
      base: BASE,
      type: 'pick',
    });
    expect(first.picked).toEqual({ backdrop: '/b2.jpg', title: '/l1.png' });
    const second = trayReducer(first, {
      base: { backdrop: '/x.jpg', title: '/x.png' },
      title: 'text',
      type: 'pick',
    });
    expect(second.picked).toEqual({ backdrop: '/b2.jpg', title: 'text' });
  });

  it('picks a backdrop or a title, and clears a failed save', () => {
    const failed = trayReducer(
      trayReducer(ready, { type: 'start', write: 'save' }),
      { type: 'fail', write: 'save' },
    );
    expect(failed).toMatchObject({ busy: null, failed: 'save' });
    const picked = trayReducer(failed, {
      base: BASE,
      title: 'text',
      type: 'pick',
    });
    expect(picked).toMatchObject({
      failed: null,
      picked: { backdrop: '/b1.jpg', title: 'text' },
    });
  });

  it('keeps the pick when a save fails', () => {
    const picked = trayReducer(ready, {
      backdrop: '/b2.jpg',
      base: BASE,
      type: 'pick',
    });
    const failed = trayReducer(
      trayReducer(picked, { type: 'start', write: 'save' }),
      { type: 'fail', write: 'save' },
    );
    expect(failed.picked).toEqual({ backdrop: '/b2.jpg', title: '/l1.png' });
  });

  it('locks the strips while saving or asking', () => {
    const saving = trayReducer(ready, { type: 'start', write: 'save' });
    expect(isLocked(saving)).toBe(true);
    expect(
      trayReducer(saving, { backdrop: '/b9.jpg', base: BASE, type: 'pick' }),
    ).toBe(saving);
    const asking = trayReducer(ready, { confirm: 'discard', type: 'ask' });
    expect(isLocked(asking)).toBe(true);
    expect(
      trayReducer(asking, { base: BASE, title: 'text', type: 'pick' }),
    ).toBe(asking);
    expect(isLocked(trayReducer(asking, { type: 'keep' }))).toBe(false);
  });

  it('never asks or starts a second write while one runs', () => {
    const saving = trayReducer(ready, { type: 'start', write: 'save' });
    expect(trayReducer(saving, { confirm: 'reset', type: 'ask' })).toBe(saving);
    expect(trayReducer(saving, { type: 'start', write: 'reset' })).toBe(saving);
  });

  it('closes the confirm when the write it asked for starts', () => {
    const asking = trayReducer(ready, { confirm: 'reset', type: 'ask' });
    expect(
      trayReducer(asking, { type: 'start', write: 'reset' }),
    ).toMatchObject({ busy: 'reset', confirm: null });
  });

  it('switches the phone tab', () => {
    expect(trayReducer(ready, { tab: 'title', type: 'tab' }).tab).toBe('title');
  });
});
