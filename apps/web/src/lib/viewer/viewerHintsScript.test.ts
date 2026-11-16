// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OWNER_VISITOR_SHEET,
  VISITOR_RULE,
} from '@/components/ui/viewer/ownerVisitorRule';
import { SIGNED_IN_RULE } from '@/components/ui/viewer/reveal';
import { setCookie } from '@/test/setCookie';
import { viewerHintsScript } from './viewerHintsScript';

/** Stand-in for adopted sheets (jsdom has none) */
class FakeSheet {
  text = '';
  replaceSync(text: string) {
    this.text = text;
  }
}

const sheets = () =>
  (document.adoptedStyleSheets as unknown as FakeSheet[]).map(
    (sheet) => sheet.text,
  );

const run = () => new Function(viewerHintsScript)();

const signIn = (value: string) => {
  setCookie(`__tvseries_user=${value}; path=/`);
};

beforeEach(() => {
  vi.stubGlobal('CSSStyleSheet', FakeSheet);
  Object.defineProperty(document, 'adoptedStyleSheets', {
    configurable: true,
    value: [],
    writable: true,
  });
  document.documentElement.removeAttribute('data-flat-glass');
});

afterEach(() => {
  setCookie('__tvseries_user=; path=/; max-age=0');
  window.history.replaceState(null, '', '/');
  delete (window as unknown as Record<string, unknown>)[OWNER_VISITOR_SHEET];
});

describe('the pre-paint script (inlined in every document)', () => {
  it('stays small: 2,805 bytes minified (SWC, as a production build)', async () => {
    const swc = await import('next/dist/build/swc');
    await swc.loadBindings();
    const { code } = await swc.minify(viewerHintsScript, {
      compress: true,
      mangle: true,
    });
    // The one pinned limit: grow it only on purpose. The e2e checks the
    // script as served (placeholders-show, under 3,000). Per hint
    // (minified): cookie read 163, Home/show prompt/Stats/Plex 1,023, region
    // 261 + 231 + 247, the signed-in rule and owner/visitor about 430 (the
    // retired MetaYearScript and SignedInScript were 1,116 bytes served
    // beside this one), the wrapper (keys, storage, the stylesheet helpers,
    // the header's handle and flat-glass flag) about 430.
    expect(code.length).toBeLessThanOrEqual(2816);
    // self-contained: no import of a module the embedded source would need
    // (`!important` in its CSS is fine)
    expect(viewerHintsScript).not.toMatch(/\bimport\b|__vite_ssr_import/);
  });

  it('puts the signed-in handle in --viewer-handle as a closed CSS string', () => {
    setCookie(`__tvseries_user=${encodeURIComponent('a"}b\\c')}; path=/`);
    run();
    expect(sheets()).toContain(':root{--viewer-handle:"a\\"}b\\\\c"}');
  });

  it('sets no handle signed out', () => {
    run();
    expect(sheets().some((text) => text.includes('--viewer-handle'))).toBe(
      false,
    );
  });

  it('flags a device with 4 cores or fewer for the flat glass', () => {
    const cores = vi.spyOn(navigator, 'hardwareConcurrency', 'get');
    // jsdom reports Apple's vendor string, as Safari does
    const vendor = vi.spyOn(navigator, 'vendor', 'get');
    vendor.mockReturnValue('Google Inc.');
    cores.mockReturnValue(4);
    run();
    expect(document.documentElement.hasAttribute('data-flat-glass')).toBe(true);
    document.documentElement.removeAttribute('data-flat-glass');
    cores.mockReturnValue(8);
    run();
    expect(document.documentElement.hasAttribute('data-flat-glass')).toBe(
      false,
    );
    cores.mockRestore();
    vendor.mockRestore();
  });

  it('keeps the blur on Apple WebKit, whose core count is capped', () => {
    const cores = vi.spyOn(navigator, 'hardwareConcurrency', 'get');
    const vendor = vi.spyOn(navigator, 'vendor', 'get');
    cores.mockReturnValue(2);
    vendor.mockReturnValue('Apple Computer, Inc.');
    run();
    expect(document.documentElement.hasAttribute('data-flat-glass')).toBe(
      false,
    );
    cores.mockRestore();
    vendor.mockRestore();
  });

  it('shows the signed-in-only space for a signed-in viewer, from the one cookie read', () => {
    signIn('alex');
    run();
    expect(sheets()).toContain(SIGNED_IN_RULE);
  });

  it.each([
    ['signed out', null],
    ['an empty display cookie', ''],
    ['a display cookie that is not URL encoding', '%E0%A4%A'],
  ])('keeps it hidden %s, like the header and the hints', (_, value) => {
    if (value !== null) {
      signIn(value);
    }
    run();
    expect(sheets()).not.toContain(SIGNED_IN_RULE);
    expect(sheets().some((text) => text.includes('--viewer-handle'))).toBe(
      false,
    );
  });

  it('picks the visitor’s placeholders on someone else’s profile', () => {
    signIn('alex');
    window.history.replaceState(null, '', '/u/juno/history');
    run();
    expect(sheets()).toContain(VISITOR_RULE);
    const win = window as unknown as Record<string, FakeSheet>;
    expect(win[OWNER_VISITOR_SHEET]?.text).toBe(VISITOR_RULE);
  });

  it('keeps the owner’s on your own profile, and none signed out', () => {
    signIn('alex');
    window.history.replaceState(null, '', '/u/Alex');
    run();
    expect(sheets()).not.toContain(VISITOR_RULE);
    setCookie('__tvseries_user=; path=/; max-age=0');
    document.adoptedStyleSheets = [];
    delete (window as unknown as Record<string, unknown>)[OWNER_VISITOR_SHEET];
    run();
    expect(
      (window as unknown as Record<string, unknown>)[OWNER_VISITOR_SHEET],
    ).toBeUndefined();
  });
});
