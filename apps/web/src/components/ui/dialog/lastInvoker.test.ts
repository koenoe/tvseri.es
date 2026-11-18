// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { dialogOpener } from './lastInvoker';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dialogOpener', () => {
  it('is the focused element when one has focus', () => {
    document.body.innerHTML = '<button id="a">A</button>';
    const button = document.getElementById('a') as HTMLButtonElement;
    button.focus();
    expect(dialogOpener()).toBe(button);
  });

  it('is the control that was clicked when the browser did not focus it (Safari)', () => {
    document.body.innerHTML =
      '<button id="b"><span id="inner">B</span></button>';
    (document.getElementById('inner') as HTMLElement).click();
    expect(document.activeElement).toBe(document.body);
    expect(dialogOpener()).toBe(document.getElementById('b'));
  });

  it('has nothing for a click on plain content', () => {
    document.body.innerHTML = '<p id="p">text</p>';
    (document.getElementById('p') as HTMLElement).click();
    expect(dialogOpener()).toBeNull();
  });
});
