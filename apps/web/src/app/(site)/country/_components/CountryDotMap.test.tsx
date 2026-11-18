import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import CountryDotMap from './CountryDotMap';

describe('CountryDotMap', () => {
  it('draws the desktop window hidden from assistive tech: the country and the rest', () => {
    const html = renderToStaticMarkup(
      <CountryDotMap code="gb" variant="desktop" />,
    );
    expect(html).toMatch(/^<div aria-hidden="true"/);
    expect(html).toContain('viewBox="0 0 1440 600"');
    expect(html.match(/<path /g)).toHaveLength(2);
  });

  it('draws the phone window', () => {
    const html = renderToStaticMarkup(
      <CountryDotMap code="KR" variant="phone" />,
    );
    expect(html).toContain('viewBox="0 0 390 420"');
  });

  it('renders nothing for a code with no shape', () => {
    expect(
      renderToStaticMarkup(<CountryDotMap code="zz" variant="desktop" />),
    ).toBe('');
  });
});
