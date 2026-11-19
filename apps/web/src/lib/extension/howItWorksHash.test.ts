// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  HOW_IT_WORKS_HREF,
  readHowItWorks,
  setHowItWorks,
  subscribeHowItWorks,
} from './howItWorksHash';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('the How it works hash', () => {
  it('is the deep link to the open drawing', () => {
    expect(HOW_IT_WORKS_HREF).toBe('/extension#how-it-works');
    window.history.replaceState(null, '', HOW_IT_WORKS_HREF);
    expect(readHowItWorks()).toBe(true);
    window.history.replaceState(null, '', '/extension#install');
    expect(readHowItWorks()).toBe(false);
  });

  it('opening sets the hash and closing removes it, without adding history entries', () => {
    window.history.replaceState(null, '', '/extension?from=card');
    const entries = window.history.length;

    setHowItWorks(true);
    expect(window.location.pathname + window.location.search).toBe(
      '/extension?from=card',
    );
    expect(window.location.hash).toBe('#how-it-works');

    setHowItWorks(false);
    expect(window.location.href).toBe(
      `${window.location.origin}/extension?from=card`,
    );
    expect(window.history.length).toBe(entries);
  });

  it('tells subscribers when it opens or closes, and when the hash changes', () => {
    window.history.replaceState(null, '', '/extension');
    const listener = vi.fn();
    const unsubscribe = subscribeHowItWorks(listener);

    setHowItWorks(true);
    expect(listener).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setHowItWorks(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
