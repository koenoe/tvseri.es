import { describe, expect, it } from 'vitest';

import { usernameHint } from './usernameHint';

const hint = (
  draft: string,
  availability: 'unknown' | 'available' | 'taken' = 'unknown',
  saved = 'wren',
) => usernameHint({ availability, draft, saved });

describe('usernameHint', () => {
  it('shows the current link while the username is unchanged', () => {
    expect(hint('wren')).toEqual({
      canSave: true,
      message: 'Your profile is at tvseri.es/u/wren',
      tone: 'neutral',
    });
  });

  it('never re-validates the saved username, even if it predates the rule', () => {
    const legacy = hint('Old_Name', 'unknown', 'Old_Name');
    expect(legacy.tone).toBe('neutral');
    expect(legacy.canSave).toBe(true);
    expect(legacy.message).toBe('Your profile is at tvseri.es/u/Old_Name');
  });

  it('asks for at least 3 characters', () => {
    for (const draft of ['', 'k', 'ko']) {
      expect(hint(draft)).toMatchObject({
        canSave: false,
        message: 'At least 3 characters',
        tone: 'bad',
      });
    }
  });

  it('names the rule and suggests the slug that works', () => {
    expect(hint('Wren R')).toMatchObject({
      canSave: false,
      message: 'Only lowercase letters, numbers and dashes: “wren-r” works',
      tone: 'bad',
    });
    expect(hint('wren_r').message).toBe(
      'Only lowercase letters, numbers and dashes: “wrenr” works',
    );
    expect(hint('-wren-').message).toBe(
      'Only lowercase letters, numbers and dashes: “wren” works',
    );
  });

  it('gives no suggestion when the slug would not be valid either', () => {
    expect(hint('k!!').message).toBe(
      'Only lowercase letters, numbers and dashes',
    );
  });

  it('caps a new username at 30 characters', () => {
    expect(hint('a'.repeat(31))).toMatchObject({
      canSave: false,
      message: 'Use 30 characters or fewer.',
      tone: 'bad',
    });
    expect(hint('a'.repeat(30)).canSave).toBe(true);
  });

  it('keeps a saved username longer than the cap', () => {
    const saved = 'a-handle-chosen-before-the-thirty-character-cap';
    expect(hint(saved, 'unknown', saved)).toMatchObject({
      canSave: true,
      tone: 'neutral',
    });
  });

  it('says a valid new username is being checked until the answer arrives', () => {
    expect(hint('wren-r')).toEqual({
      canSave: true,
      message: 'Checking tvseri.es/u/wren-r…',
      tone: 'neutral',
    });
  });

  it('says a free username is available and the old link stops working', () => {
    expect(hint('wren-r', 'available')).toEqual({
      canSave: true,
      message: 'tvseri.es/u/wren-r is available · your old link stops working',
      tone: 'ok',
    });
  });

  it('says a taken username is taken and blocks saving', () => {
    expect(hint('juno', 'taken')).toEqual({
      canSave: false,
      message: 'tvseri.es/u/juno is taken',
      tone: 'bad',
    });
  });

  it('reads the rule before the availability', () => {
    expect(hint('Juno', 'taken').message).toContain('“juno” works');
  });

  // A name that reads as the site, a role or a page is never offered
  it.each(['admin', 'support', 'tvseries'])(
    'says %s is reserved, whatever the availability',
    (name) => {
      expect(hint(name, 'available')).toEqual({
        canSave: false,
        message: `tvseri.es/u/${name} is reserved`,
        tone: 'bad',
      });
    },
  );
});
