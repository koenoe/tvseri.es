import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { eyeGlyph, searchGlyph } from './glyphs';
import Icon from './Icon';

const svg = (markup: string) => {
  const open = /^<svg[^>]*>/.exec(markup)?.[0] ?? '';
  const attr = (name: string) =>
    new RegExp(` ${name}="([^"]*)"`).exec(open)?.[1] ?? null;
  return { attr, markup };
};

describe('Icon', () => {
  it.each([
    [13, '2'],
    [15, '2'],
    [16, '2'],
    [20, '1.8'],
    [24, '1.75'],
  ] as const)('draws %ipx with stroke %s (icons_final.md)', (size, stroke) => {
    const { attr } = svg(
      renderToStaticMarkup(<Icon glyph={searchGlyph} size={size} />),
    );
    expect(attr('width')).toBe(String(size));
    expect(attr('height')).toBe(String(size));
    expect(attr('stroke-width')).toBe(stroke);
    expect(attr('viewBox')).toBe('0 0 24 24');
  });

  it('is decorative unless it carries a label', () => {
    const decorative = svg(
      renderToStaticMarkup(<Icon glyph={searchGlyph} size={16} />),
    );
    expect(decorative.attr('aria-hidden')).toBe('true');
    expect(decorative.attr('role')).toBeNull();

    const labelled = svg(
      renderToStaticMarkup(
        <Icon glyph={searchGlyph} label="Search" size={20} />,
      ),
    );
    expect(labelled.attr('aria-hidden')).toBeNull();
    expect(labelled.attr('role')).toBe('img');
    expect(labelled.attr('aria-label')).toBe('Search');
  });

  it('draws the filled glyph when a toggle is active', () => {
    const outline = renderToStaticMarkup(<Icon glyph={eyeGlyph} size={16} />);
    const filled = renderToStaticMarkup(
      <Icon active glyph={eyeGlyph} size={16} />,
    );
    // the outline strokes the lid, the filled drawing has no stroke at all
    expect(outline).toContain('stroke-width="40"');
    expect(filled).not.toContain('stroke-width="40"');
    expect(filled).toContain('stroke="none"');
    expect(
      renderToStaticMarkup(<Icon active={false} glyph={eyeGlyph} size={16} />),
    ).toBe(outline);
  });

  it('inherits the text colour and keeps round caps and joins', () => {
    const { attr } = svg(
      renderToStaticMarkup(<Icon glyph={searchGlyph} size={13} />),
    );
    expect(attr('stroke')).toBe('currentColor');
    expect(attr('fill')).toBe('none');
    expect(attr('stroke-linecap')).toBe('round');
    expect(attr('stroke-linejoin')).toBe('round');
  });
});

describe('Icon types', () => {
  it('only takes `active` on toggle glyphs', () => {
    const markup = renderToStaticMarkup(
      // @ts-expect-error search has no filled drawing
      <Icon active glyph={searchGlyph} size={16} />,
    );
    expect(markup).toContain('<svg');
  });
});
