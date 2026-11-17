import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { calendarGlyph, usersGlyph } from '@/components/ui/icon/glyphs';

import { IdentityLine, IdentityLines, IdentityLinkLine } from './IdentityLines';

describe('IdentityLines', () => {
  it('draws a line as its icon, then the place’s words', () => {
    const html = renderToStaticMarkup(
      <IdentityLines>
        <IdentityLine glyph={calendarGlyph}>Member since today</IdentityLine>
      </IdentityLines>,
    );

    const icon = html.indexOf('<svg');
    expect(icon).toBeGreaterThan(-1);
    expect(html.indexOf('Member since today')).toBeGreaterThan(icon);
  });

  it('links a line where the place passes a href', () => {
    const html = renderToStaticMarkup(
      <IdentityLinkLine glyph={usersGlyph} href="/u/alex/circle">
        6 followers · 8 following
      </IdentityLinkLine>,
    );

    expect(html).toContain('href="/u/alex/circle"');
  });
});
