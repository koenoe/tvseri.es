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
  it('draws at the size it is given', () => {
    const { attr } = svg(
      renderToStaticMarkup(<Icon glyph={searchGlyph} size={20} />),
    );
    expect(attr('width')).toBe('20');
    expect(attr('height')).toBe('20');
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

  it('inherits the text colour', () => {
    const { attr } = svg(
      renderToStaticMarkup(<Icon glyph={searchGlyph} size={13} />),
    );
    expect(attr('stroke')).toBe('currentColor');
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
