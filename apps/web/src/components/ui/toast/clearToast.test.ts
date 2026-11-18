// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearToastOver,
  clearToastOverFooter,
  clearToastOverSheet,
  releaseToastSheet,
  TOAST_CLEAR,
  TOAST_FOOTER,
  TOAST_SHEET,
} from './clearToast';
import { getToastHost } from './toastHost';

class FakeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
}

describe('clearToastOver', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeObserver);
  });
  afterEach(() => {
    document.documentElement.style.removeProperty(TOAST_CLEAR);
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  const bar = (position: string, bottom: number, height: number) => {
    const node = document.createElement('div');
    node.style.position = position;
    node.style.bottom = `${bottom}px`;
    Object.defineProperty(node, 'offsetHeight', { value: height });
    document.body.append(node);
    return node;
  };

  it('lifts the toast 8px above a docked bar, and lets go when it goes', () => {
    const cleanup = clearToastOver(bar('fixed', 29, 66));
    expect(document.documentElement.style.getPropertyValue(TOAST_CLEAR)).toBe(
      '103px',
    );
    cleanup?.();
    expect(document.documentElement.style.getPropertyValue(TOAST_CLEAR)).toBe(
      '',
    );
  });

  it('does nothing for a bar in the flow (desktop)', () => {
    clearToastOver(bar('static', 0, 66));
    expect(document.documentElement.style.getPropertyValue(TOAST_CLEAR)).toBe(
      '',
    );
  });
});

describe('clearToastOverFooter', () => {
  let report: (entries: Array<{ isIntersecting: boolean }>) => void;
  class FakeIntersection {
    constructor(callback: typeof report) {
      report = callback;
    }
    observe = vi.fn();
    disconnect = vi.fn();
  }
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', FakeIntersection);
    // Runs the frame at once (and returns no pending handle)
    vi.stubGlobal('requestAnimationFrame', (run: () => void) => {
      run();
      return 0;
    });
    vi.stubGlobal('innerHeight', 900);
  });
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  const footerAt = (top: number) => {
    const footer = document.createElement('footer');
    footer.getBoundingClientRect = () => ({ top }) as DOMRect;
    const node = document.createElement('span');
    footer.append(node);
    document.body.append(footer);
    return { footer, node };
  };

  /** A toast in the host, as sonner renders one */
  const showToastIn = (host: HTMLElement) => {
    const toast = document.createElement('li');
    toast.setAttribute('data-sonner-toast', '');
    host.append(toast);
    return toast;
  };

  it('rides the toast 8px above the footer while it is in view, and lets go', () => {
    const { footer, node } = footerAt(780);
    const cleanup = clearToastOverFooter(node);
    const host = getToastHost();
    const toast = showToastIn(host);
    report([{ isIntersecting: true }]);
    expect(host.style.getPropertyValue(TOAST_FOOTER)).toBe('128px');
    footer.getBoundingClientRect = () => ({ top: 820 }) as DOMRect;
    window.dispatchEvent(new Event('scroll'));
    expect(host.style.getPropertyValue(TOAST_FOOTER)).toBe('88px');
    footer.getBoundingClientRect = () => ({ top: 1200 }) as DOMRect;
    report([{ isIntersecting: false }]);
    expect(host.style.getPropertyValue(TOAST_FOOTER)).toBe('');
    cleanup?.();
    toast.remove();
  });

  it('reads no layout while no toast is shown, and follows one that arrives', async () => {
    const { footer, node } = footerAt(780);
    const read = vi.spyOn(footer, 'getBoundingClientRect');
    const cleanup = clearToastOverFooter(node);
    const host = getToastHost();
    report([{ isIntersecting: true }]);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    expect(read).not.toHaveBeenCalled();
    expect(host.style.getPropertyValue(TOAST_FOOTER)).toBe('');
    const toast = showToastIn(host);
    // the host's mutation is seen in a microtask
    await Promise.resolve();
    expect(host.style.getPropertyValue(TOAST_FOOTER)).toBe('128px');
    toast.remove();
    await Promise.resolve();
    expect(host.style.getPropertyValue(TOAST_FOOTER)).toBe('');
    cleanup?.();
  });

  it('does nothing outside a footer', () => {
    expect(clearToastOverFooter(document.createElement('span'))).toBe(
      undefined,
    );
  });
});

describe('clearToastOverSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeObserver);
  });
  afterEach(() => {
    document.documentElement.style.removeProperty(TOAST_SHEET);
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  /** A panel in an 844px dialog: its layout top and height */
  const panel = (top: number, height: number) => {
    const dialog = document.createElement('div');
    Object.defineProperty(dialog, 'clientHeight', { value: 844 });
    const node = document.createElement('div');
    Object.defineProperty(node, 'offsetParent', { value: dialog });
    Object.defineProperty(node, 'offsetTop', { value: top });
    Object.defineProperty(node, 'offsetHeight', { value: height });
    dialog.append(node);
    document.body.append(dialog);
    return node;
  };
  const value = () =>
    document.documentElement.style.getPropertyValue(TOAST_SHEET);

  it('lifts the toast 8px above a bottom sheet, and lets go when it closes', () => {
    const cleanup = clearToastOverSheet(panel(569, 275));
    expect(value()).toBe('283px');
    cleanup?.();
    expect(value()).toBe('');
  });

  it('leaves a centred dialog and a full-screen sheet alone', () => {
    clearToastOverSheet(panel(300, 240));
    expect(value()).toBe('');
    clearToastOverSheet(panel(0, 844));
    expect(value()).toBe('');
  });

  it('keeps the outer sheet’s lift when a sheet over it closes', () => {
    const outer = clearToastOverSheet(panel(569, 275));
    const inner = clearToastOverSheet(panel(444, 400));
    expect(value()).toBe('408px');
    inner?.();
    expect(value()).toBe('283px');
    outer?.();
    expect(value()).toBe('');
  });

  it('lets go as soon as the sheet starts to close', () => {
    const node = panel(569, 275);
    const cleanup = clearToastOverSheet(node);
    releaseToastSheet(node);
    expect(value()).toBe('');
    cleanup?.();
    expect(value()).toBe('');
  });
});
