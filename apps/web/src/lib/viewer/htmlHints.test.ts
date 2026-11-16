import { describe, expect, it } from 'vitest';

import {
  applyHtmlHints,
  LIBRARY_HINT_KEY,
  LIBRARY_HINT_VERSION,
  PLEX_HINT_KEY,
  PLEX_HINT_VERSION,
  PROMPT_HINT_KEY,
  PROMPT_HINT_VERSION,
} from './htmlHints';
import { readCookieUser } from './readCookieUser';

const COOKIE = '__tvseries_user';

function run(
  path: string,
  options: Readonly<{
    cookie?: string;
    stored?: string | null;
    /** The first-tracking prompt hint (`PROMPT_HINT_KEY`) */
    prompt?: string | null;
    throws?: boolean;
    year?: number;
  }> = {},
) {
  const attributes = new Map<string, string>();
  const root = {
    removeAttribute: (name: string) => void attributes.delete(name),
    setAttribute: (name: string, value: string) =>
      void attributes.set(name, value),
  };
  const removed: string[] = [];
  const storage = options.throws
    ? {
        getItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {
          throw new Error('blocked');
        },
      }
    : {
        getItem: (key: string) =>
          (key === PROMPT_HINT_KEY ? options.prompt : options.stored) ?? null,
        removeItem: (key: string) => void removed.push(key),
      };
  applyHtmlHints(
    root,
    path,
    readCookieUser(options.cookie ?? `${COOKIE}=kit`, COOKIE),
    storage,
    options.year ?? 2026,
    LIBRARY_HINT_KEY,
    LIBRARY_HINT_VERSION,
    PLEX_HINT_KEY,
    PLEX_HINT_VERSION,
    PROMPT_HINT_KEY,
    PROMPT_HINT_VERSION,
  );
  return { attributes: Object.fromEntries(attributes), removed };
}

const hint = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    ids: [136315, 7],
    u: 'kit',
    v: LIBRARY_HINT_VERSION,
    ...over,
  });

describe('show library hint (the first-tracking prompt)', () => {
  it("hides the prompt for a show in the viewer's library, not for one that is not", () => {
    expect(run('/136315/the-bear', { stored: hint() }).attributes).toEqual({
      'data-show-prompt': 'no',
    });
    expect(
      run('/900004/harbour-lights', { stored: hint() }).attributes,
    ).toEqual({});
  });

  it('hides it for a show the viewer answered here (signed in), by account', () => {
    const answered = JSON.stringify({
      ids: [900004],
      u: 'kit',
      v: PROMPT_HINT_VERSION,
    });
    expect(
      run('/900004/harbour-lights', { prompt: answered }).attributes,
    ).toEqual({ 'data-show-prompt': 'no' });
    expect(
      run('/900004', { cookie: `${COOKIE}=rae`, prompt: answered }).attributes,
    ).toEqual({});
  });

  it('hides it for a visitor who dismissed it here, and keeps that hint', () => {
    const dismissed = JSON.stringify({
      ids: [900004],
      u: '',
      v: PROMPT_HINT_VERSION,
    });
    const result = run('/900004', { cookie: '', prompt: dismissed });
    expect(result.attributes).toEqual({ 'data-show-prompt': 'no' });
    expect(result.removed).not.toContain(PROMPT_HINT_KEY);
    // a visitor's dismissals are not a signed-in viewer's answers
    expect(run('/900004', { prompt: dismissed }).attributes).toEqual({});
    expect(run('/7', { cookie: '', prompt: dismissed }).attributes).toEqual({});
  });

  it('is keyed by the viewer: another account never reuses it', () => {
    expect(
      run('/136315', { cookie: `${COOKIE}=rae`, stored: hint() }).attributes,
    ).toEqual({});
  });

  it('ignores another version, bad JSON and a missing hint', () => {
    expect(run('/7', { stored: hint({ v: 99 }) }).attributes).toEqual({});
    expect(run('/7', { stored: '{nope' }).attributes).toEqual({});
    expect(run('/7', { stored: hint({ ids: 'x' }) }).attributes).toEqual({});
    expect(run('/7', { stored: null }).attributes).toEqual({});
  });

  it('sets nothing off a show route', () => {
    expect(run('/discover', { stored: hint() }).attributes).toEqual({});
    expect(run('/person/17419/x', { stored: hint() }).attributes).toEqual({});
  });

  it('clears the stored hint when signed out, and sets nothing', () => {
    const result = run('/136315', { cookie: '', stored: hint() });
    expect(result.attributes).toEqual({});
    expect(result.removed).toEqual([LIBRARY_HINT_KEY, PLEX_HINT_KEY]);
  });

  it('survives storage that throws', () => {
    expect(run('/136315', { throws: true }).attributes).toEqual({});
  });
});

const plexHint = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ n: 3, s: 'on', u: 'kit', v: PLEX_HINT_VERSION, ...over });

describe('Plex card hint', () => {
  it('sets the state and the number of recent plays on the Plex route', () => {
    expect(run('/settings/plex', { stored: plexHint() }).attributes).toEqual({
      'data-plex': 'on',
      'data-plex-n': '3',
    });
    expect(
      run('/settings/plex/', { stored: plexHint({ n: 0, s: 'wait' }) })
        .attributes,
    ).toEqual({ 'data-plex': 'wait' });
  });

  it('is keyed by the viewer and the version, and ignores junk', () => {
    expect(
      run('/settings/plex', { cookie: `${COOKIE}=rae`, stored: plexHint() })
        .attributes,
    ).toEqual({});
    expect(
      run('/settings/plex', { stored: plexHint({ v: 99 }) }).attributes,
    ).toEqual({});
    expect(
      run('/settings/plex', { stored: plexHint({ s: 'huge' }) }).attributes,
    ).toEqual({});
    expect(run('/settings/plex', { stored: '{nope' }).attributes).toEqual({});
    expect(run('/settings/plex', { stored: null }).attributes).toEqual({});
  });

  it('sets nothing on other settings routes, or without storage', () => {
    expect(run('/settings/profile', { stored: plexHint() }).attributes).toEqual(
      {},
    );
    expect(
      run('/settings/plex', { stored: plexHint(), throws: true }).attributes,
    ).toEqual({});
  });
});

describe('stats year hint', () => {
  it('compares the path year with the current year, signed in or not', () => {
    expect(run('/u/lena/stats/2025', { cookie: '' }).attributes).toEqual({
      'data-stats-year': 'finished',
    });
    expect(run('/u/lena/stats/2026').attributes).toEqual({
      'data-stats-year': 'current',
    });
    expect(run('/u/lena/stats/2027').attributes).toEqual({
      'data-stats-year': 'future',
    });
  });

  it('is set even without storage', () => {
    expect(
      run('/u/lena/stats/2024', { throws: true }).attributes['data-stats-year'],
    ).toBe('finished');
  });
});

describe('Home hint', () => {
  it('says new when the viewer is signed in and their library is known to be empty', () => {
    expect(run('/', { stored: hint({ ids: [] }) }).attributes).toEqual({
      'data-home': 'new',
    });
  });

  it('says member for any other signed-in viewer, hint or not', () => {
    expect(run('/', { stored: hint() }).attributes).toEqual({
      'data-home': 'member',
    });
    expect(run('/', { stored: null }).attributes).toEqual({
      'data-home': 'member',
    });
    expect(
      run('/', { cookie: `${COOKIE}=rae`, stored: hint({ ids: [] }) })
        .attributes,
    ).toEqual({ 'data-home': 'member' });
  });

  it('sets nothing for a visitor, and not off Home', () => {
    expect(
      run('/', { cookie: '', stored: hint({ ids: [] }) }).attributes,
    ).toEqual({});
    expect(run('/discover', { stored: hint({ ids: [] }) }).attributes).toEqual(
      {},
    );
  });
});
