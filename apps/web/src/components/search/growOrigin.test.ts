// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import growOrigin from './growOrigin';

function placed(tag: string, rect: Partial<DOMRect>) {
  const element = document.createElement(tag);
  element.getBoundingClientRect = () =>
    ({ height: 0, left: 0, top: 0, width: 0, ...rect }) as DOMRect;
  return element;
}

function panelAt(left: number, top: number) {
  const panel = document.createElement('div');
  Object.defineProperty(panel, 'offsetLeft', { value: left });
  Object.defineProperty(panel, 'offsetTop', { value: top });
  return panel;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('growOrigin', () => {
  it('is the trigger’s centre in the panel’s coordinates', () => {
    const trigger = placed('button', {
      height: 20,
      left: 1300,
      top: 30,
      width: 20,
    });
    document.body.append(trigger);

    expect(growOrigin(trigger, panelAt(384, 128))).toBe('926px -88px');
  });

  it('opened with the shortcut, grows from the header’s search icon (production)', () => {
    const header = document.createElement('header');
    const icon = placed('button', {
      height: 24,
      left: 1000,
      top: 40,
      width: 24,
    });
    icon.dataset.searchTrigger = '';
    header.append(icon);
    document.body.append(header);

    expect(growOrigin(null, panelAt(0, 0))).toBe('1012px 52px');
  });

  it('without any icon on screen, grows from its top centre', () => {
    expect(growOrigin(null, panelAt(0, 0))).toBe('50% 0');
  });
});
