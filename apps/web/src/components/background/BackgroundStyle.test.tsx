import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import BackgroundStyle from './BackgroundStyle';
import { PAGE_COLOUR_LIVE } from './pageColor';

const render = (color: string) =>
  renderToStaticMarkup(<BackgroundStyle color={color} />);

describe('BackgroundStyle', () => {
  it('sets the page colour on :root in the server HTML', () => {
    expect(render('#2B3A4C')).toContain(
      ':root { --main-background-color: #2b3a4c; }',
    );
  });

  it.each([
    'red',
    '#fff;}body{display:none}',
    'url(https://evil.example/x.png)',
    '#fff',
    '#000000</style><script>alert(1)</script>',
  ])('never writes %s into the style tag', (color) => {
    const html = render(color);
    expect(html).toContain(':root { --main-background-color: #1c2223; }');
    expect(html).not.toContain(color);
  });

  it('also hoists the colour into <head> for the document until the page takes over', () => {
    const html = render('#2B3A4C');
    // React 19 hoists a <style> with `href` and `precedence` into <head>
    expect(html).toContain('data-precedence="page-colour"');
    expect(html).toContain(
      `html:not([${PAGE_COLOUR_LIVE}]) { --main-background-color: #2b3a4c; }`,
    );
  });

  it('renders no inline script', () => {
    expect(render('#2b3a4c')).not.toContain('<script');
  });

  it('paints the site footer, not every <footer> (dialog footers keep theirs)', () => {
    const html = render('#2b3a4c');
    expect(html).toContain('[data-site-footer]');
    expect(html).not.toMatch(/(^|[\s,])footer\s*[,{]/m);
  });
});
