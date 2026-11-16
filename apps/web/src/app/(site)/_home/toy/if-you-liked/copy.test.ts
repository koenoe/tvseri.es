import type { PickItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { reasonLine, subline } from './copy';

const item = (
  kind: PickItem['reason']['kind'],
  label: string,
  genres: ReadonlyArray<string> = [],
): Pick<PickItem, 'reason'> & {
  series: Readonly<{ genres: ReadonlyArray<{ name: string }> }>;
} => ({
  reason: { kind, label },
  series: { genres: genres.map((name) => ({ name })) },
});

describe('subline', () => {
  it('names a theme every one of them shares, quoted (TMDB keywords are tags, not nouns)', () => {
    expect(
      subline([
        item('keyword', 'family business'),
        item('keyword', 'family business'),
      ]),
    ).toBe('Two series on the theme “family business”');
  });

  it('says how many share it when only some do (never claims all four)', () => {
    expect(
      subline([
        item('keyword', 'based on novel or book'),
        item('network', 'Netflix'),
        item('keyword', 'based on novel or book'),
        item('recommendation', ''),
      ]),
    ).toBe('Four series like it, two on the theme “based on novel or book”');
  });

  it('reads correctly for any keyword shape and any count', () => {
    const shapes = [
      'based on novel or book',
      'interview',
      'new york city',
      'lgbt',
      'miniseries',
      'woman director',
      '1980s',
      'Spain',
    ];
    const words = ['One', 'Two', 'Three', 'Four'];
    for (const label of shapes) {
      for (const [index, word] of words.entries()) {
        const all = Array.from({ length: index + 1 }, () =>
          item('keyword', label),
        );
        expect(subline(all)).toBe(`${word} series on the theme “${label}”`);
      }
      expect(
        subline([
          item('keyword', label),
          item('recommendation', ''),
          item('recommendation', ''),
        ]),
      ).toBe(`Three series like it, one on the theme “${label}”`);
    }
  });

  it('never pastes a keyword into a sentence that needs grammar', () => {
    for (const label of ['based on novel or book', 'interview', 'sequel']) {
      const line = subline([item('keyword', label), item('network', 'HBO')]);
      expect(line).not.toMatch(/with its|its [a-z]/);
      expect(line).toContain(`“${label}”`);
    }
  });

  it('names the network when no theme is shared', () => {
    expect(subline([item('network', 'HBO'), item('network', 'HBO')])).toBe(
      'Two series like it, from HBO',
    );
    expect(
      subline([item('network', 'BBC One'), item('recommendation', '')]),
    ).toBe('Two series like it, one from BBC One');
  });

  it('picks the reason most of them share', () => {
    expect(
      subline([
        item('keyword', 'heist'),
        item('network', 'Netflix'),
        item('network', 'Netflix'),
        item('network', 'Netflix'),
      ]),
    ).toBe('Four series like it, three from Netflix');
  });

  it('falls back to what its fans watch', () => {
    expect(subline([item('recommendation', '')])).toBe(
      'One series its fans watch next',
    );
    expect(subline([item('keyword', '  ')])).toBe(
      'One series its fans watch next',
    );
    expect(subline([])).toBe('');
  });
});

describe('reasonLine', () => {
  it('never draws an empty or comma-only line (genres that came as ids)', () => {
    expect(reasonLine(item('recommendation', '', ['', '']))).toBeUndefined();
    expect(reasonLine(item('recommendation', '', ['', 'Drama']))).toEqual({
      kind: 'genre',
      text: 'Drama',
    });
  });

  it('says the theme, the network or the genres', () => {
    expect(reasonLine(item('keyword', 'grief'))).toEqual({
      kind: 'theme',
      text: 'Theme: grief',
    });
    expect(reasonLine(item('network', 'HBO'))).toEqual({
      kind: 'network',
      text: 'HBO',
    });
    expect(
      reasonLine(item('recommendation', '', ['Comedy', 'Drama', 'Crime'])),
    ).toEqual({ kind: 'genre', text: 'Comedy, Drama' });
  });

  it('has nothing to say without a label or genres', () => {
    expect(reasonLine(item('recommendation', ''))).toBeUndefined();
    expect(reasonLine(item('keyword', ''))).toBeUndefined();
  });
});
