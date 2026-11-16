// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { openedFromKeyboard, quietFocus, returnFocus } from './focusReturn';

const button = (label: string) => {
  const element = document.createElement('button');
  element.textContent = label;
  document.body.append(element);
  return element;
};

const key = (target: EventTarget, name: string) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, key: name }),
  );

afterEach(() => {
  document.body.innerHTML = '';
});

describe('openedFromKeyboard', () => {
  it('says yes for Enter, Space or an arrow on the trigger', () => {
    const trigger = button('Search');
    for (const name of ['Enter', ' ', 'ArrowDown']) {
      key(trigger, name);
      expect(openedFromKeyboard(trigger)).toBe(true);
    }
  });

  it('says no after a pointer, a shortcut elsewhere, or with no trigger', () => {
    const trigger = button('Search');
    key(trigger, 'Enter');
    document.dispatchEvent(new Event('pointerdown'));
    expect(openedFromKeyboard(trigger)).toBe(false);

    key(document.body, 'k');
    expect(openedFromKeyboard(trigger)).toBe(false);

    key(trigger, 'Enter');
    expect(openedFromKeyboard(null)).toBe(false);
  });

  it('says no for another key on the trigger', () => {
    const trigger = button('Search');
    key(trigger, '/');
    expect(openedFromKeyboard(trigger)).toBe(false);
  });
});

describe('returnFocus', () => {
  it('focuses the trigger with its ring when the keyboard opened it', () => {
    const trigger = button('Search');
    returnFocus(trigger, true);
    expect(document.activeElement).toBe(trigger);
    expect(trigger.dataset.quietFocus).toBe(undefined);
  });

  it('focuses it quietly otherwise, until Tab or an arrow', () => {
    const trigger = button('Search');
    returnFocus(trigger, false);
    expect(document.activeElement).toBe(trigger);
    expect(trigger.dataset.quietFocus).toBe('');

    key(trigger, 'Escape');
    expect(trigger.dataset.quietFocus).toBe('');
    key(trigger, 'ArrowRight');
    expect(trigger.dataset.quietFocus).toBe(undefined);
  });

  it('lets go when focus moves on', () => {
    const trigger = button('Search');
    const next = button('Menu');
    returnFocus(trigger, false);
    next.focus();
    expect(trigger.dataset.quietFocus).toBe(undefined);
  });
});

describe('quietFocus', () => {
  it('leaves the body alone', () => {
    quietFocus(document.body);
    expect(document.body.dataset.quietFocus).toBe(undefined);
  });
});
