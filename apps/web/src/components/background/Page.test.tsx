import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Page from './Page';

describe('Page', () => {
  it('paints its colour in the server HTML', () => {
    const html = renderToStaticMarkup(
      <Page backgroundColor="#2b3a4c" backgroundContext="dots">
        content
      </Page>,
    );
    expect(html).toContain('--main-background-color: #2b3a4c;');
    expect(html).toContain('<main');
    expect(html).toContain('background-color:#2b3a4c');
  });

  it('uses the ground when no colour is given', () => {
    const html = renderToStaticMarkup(<Page backgroundContext="dots">x</Page>);
    expect(html).toContain('--main-background-color: #1c2223;');
  });

  it('never lets a bad colour into the markup', () => {
    const color = 'red;}body{background:url(https://evil.example)}';
    const html = renderToStaticMarkup(
      <Page backgroundColor={color} backgroundContext="grid">
        x
      </Page>,
    );
    expect(html).not.toContain('evil.example');
    expect(html).toContain('background-color:#1c2223');
  });

  it('wraps the backdrop when a page asks for it (its own phone backdrop)', () => {
    const html = renderToStaticMarkup(
      <Page backgroundClassName="max-md:hidden" backgroundContext="dots">
        x
      </Page>,
    );
    expect(html).toContain(
      '<div class="max-md:hidden"><div class="pointer-events-none',
    );
  });
});
