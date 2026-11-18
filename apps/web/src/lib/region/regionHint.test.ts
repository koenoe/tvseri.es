// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { viewerHintsScript } from '@/lib/viewer/viewerHintsScript';
import {
  REGION_HINT_KEY,
  REGION_HINT_MAX_AGE_MS,
  REGION_HINT_VERSION,
  readRegionHint,
} from './regionHint';

const NOW = Date.UTC(2026, 10, 13, 12);
const record = (fields: Record<string, unknown>) =>
  JSON.stringify({ r: 'GB', t: NOW - 1000, u: '', v: 1, ...fields });
const fakeStorage = (value: string | null) => ({ getItem: () => value });
const read = (value: string | null, user: string | null = null) =>
  readRegionHint(
    fakeStorage(value),
    user,
    NOW,
    REGION_HINT_KEY,
    REGION_HINT_VERSION,
    REGION_HINT_MAX_AGE_MS,
  );

describe('readRegionHint', () => {
  it("returns this viewer's fresh region", () => {
    expect(read(record({}))).toBe('GB');
    expect(read(record({ u: 'nina' }), 'nina')).toBe('GB');
  });

  it.each([
    ['another viewer', record({ u: 'nina' })],
    ['a day old', record({ t: NOW - REGION_HINT_MAX_AGE_MS })],
    ['from the future', record({ t: NOW + 1000 })],
    ['another version', record({ v: 2 })],
    ['not a code', record({ r: 'gb"}' })],
    ['broken JSON', '{'],
    ['nothing', null],
  ])('ignores %s', (_, value) => {
    expect(read(value)).toBeNull();
  });
});

/** The script as the browser runs it, with a stand-in for adopted sheets */
class FakeSheet {
  text = '';
  replaceSync(text: string) {
    this.text = text;
  }
}

describe('the pre-paint script', () => {
  beforeEach(() => {
    vi.stubGlobal('CSSStyleSheet', FakeSheet);
    Object.defineProperty(document, 'adoptedStyleSheets', {
      configurable: true,
      value: [],
      writable: true,
    });
    document.documentElement.removeAttribute('data-region');
    localStorage.clear();
  });
  const run = () => new Function(viewerHintsScript)();
  const sheetText = () =>
    (document.adoptedStyleSheets as unknown as FakeSheet[]).find((sheet) =>
      sheet.text.includes('--region-line'),
    )?.text;

  it('draws the stored line for this viewer', () => {
    localStorage.setItem(
      REGION_HINT_KEY,
      JSON.stringify({ r: 'NL', t: Date.now(), u: '', v: 1 }),
    );
    run();
    expect(document.documentElement.dataset.region).toBe('stored');
    expect(sheetText()).toBe(
      ':root{--region-line:"Streaming in the Netherlands"}',
    );
  });

  it("reserves the browser language's country on a first visit", () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB');
    run();
    expect(document.documentElement.dataset.region).toBe('guess');
    expect(sheetText()).toBe(
      ':root{--region-line:"Streaming in the United Kingdom"}',
    );
  });

  it("never draws another viewer's region", () => {
    localStorage.setItem(
      REGION_HINT_KEY,
      JSON.stringify({ r: 'NL', t: Date.now(), u: 'nina', v: 1 }),
    );
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE');
    run();
    expect(document.documentElement.dataset.region).toBe('guess');
    expect(sheetText()).toBe(':root{--region-line:"Streaming in Germany"}');
  });
});
