import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import CountryDotMap from './CountryDotMap';

describe('CountryDotMap', () => {
  it('draws the desktop window: hidden from assistive tech, sized, faded', () => {
    const html = renderToStaticMarkup(
      <CountryDotMap className="absolute" code="gb" variant="desktop" />,
    );
    expect(html).toMatch(
      /^<div aria-hidden="true" class="pointer-events-none absolute"/,
    );
    expect(html).toContain('height:600px;');
    expect(html).toContain('width:1440px"');
    expect(html).toContain(
      'mask-image:radial-gradient(ellipse 576px 410px at 864px 390px',
    );
    expect(html).toContain('viewBox="0 0 1440 600"');
    expect(html.match(/<path /g)).toHaveLength(2);
    expect(html).toContain('stroke-width="5"');
    expect(html).toContain('stroke-width="6"');
  });

  it('draws the phone window with 8px dots', () => {
    const html = renderToStaticMarkup(
      <CountryDotMap code="KR" variant="phone" />,
    );
    expect(html).toContain('height:420px;');
    expect(html).toContain('width:390px"');
    expect(html).toContain('stroke-width="3.5"');
    expect(html).toContain('stroke-width="4"');
  });

  it('renders nothing for a code with no shape', () => {
    expect(
      renderToStaticMarkup(<CountryDotMap code="zz" variant="desktop" />),
    ).toBe('');
  });
});
