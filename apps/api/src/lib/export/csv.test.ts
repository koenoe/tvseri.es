import { describe, expect, it } from 'vitest';

import { csvCell, toCsv } from './csv';

describe('csv', () => {
  it('leaves plain cells alone and writes empty for nothing', () => {
    expect(csvCell('Severance')).toBe('Severance');
    expect(csvCell(3)).toBe('3');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes cells with commas, quotes and line breaks', () => {
    expect(csvCell('Fargo, Season 1')).toBe('"Fargo, Season 1"');
    expect(csvCell('The "Wire"')).toBe('"The ""Wire"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });

  it('defuses a formula: a cell starting with = + - @, tab or CR gets an apostrophe (OWASP)', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+1 Plus')).toBe("'+1 Plus");
    expect(csvCell('-2+3+cmd|x')).toBe("'-2+3+cmd|x");
    expect(csvCell('-Mas')).toBe("'-Mas");
    expect(csvCell('@SUM(1)')).toBe("'@SUM(1)");
    expect(csvCell('\tTab')).toBe("'\tTab");
  });

  it('leaves numbers alone, negative ones too, and a dash inside a title', () => {
    expect(csvCell(-1)).toBe('-1');
    expect(csvCell('Spider-Man')).toBe('Spider-Man');
  });

  it('joins rows with CRLF and ends with one', () => {
    expect(toCsv(['a', 'b'], [[1, 'x,y']])).toBe('a,b\r\n1,"x,y"\r\n');
  });
});
