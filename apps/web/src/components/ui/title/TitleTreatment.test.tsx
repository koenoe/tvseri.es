import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TitleTreatment, {
  TitleTreatmentLogo,
  type TitleTreatmentLook,
} from './TitleTreatment';

const IN_BOX: TitleTreatmentLook = {
  box: 'logo-box',
  logo: 'logo-fit',
  sizes: '200px',
  text: 'title-text',
};

const OWN_SIZE: TitleTreatmentLook = {
  height: 44,
  lines: 'title-lines',
  logo: 'logo-size',
  text: 'title-text',
  width: 150,
};

const SRC = 'https://image.example/logo.png';

describe('TitleTreatment', () => {
  it('draws the logo filling its box, its alt the title', () => {
    const html = renderToStaticMarkup(
      <TitleTreatment look={IN_BOX} src={SRC} title="Breaking Bad" />,
    );

    expect(html).toContain('alt="Breaking Bad"');
    expect(html).toContain('sizes="200px"');
    expect(html).not.toContain('>Breaking Bad<');
  });

  it('draws a logo at its own size, lazily by default', () => {
    const html = renderToStaticMarkup(
      <TitleTreatment look={OWN_SIZE} src={SRC} title="Breaking Bad" />,
    );

    expect(html).toContain('width="150"');
    expect(html).toContain('height="44"');
    expect(html).toContain('loading="lazy"');
  });

  it('writes the title when the show has no logo', () => {
    const html = renderToStaticMarkup(
      <TitleTreatment look={IN_BOX} src={undefined} title="Breaking Bad" />,
    );

    expect(html).not.toContain('<img');
    expect(html).toContain('>Breaking Bad<');
  });

  it('writes the title in the place’s element', () => {
    const html = renderToStaticMarkup(
      <TitleTreatment
        as="h1"
        look={OWN_SIZE}
        src={null}
        title="Breaking Bad"
      />,
    );

    expect(html).toMatch(/^<h1[^>]*>.*Breaking Bad.*<\/h1>$/);
  });

  it('passes the place’s alt, loading and dragging to the logo', () => {
    const html = renderToStaticMarkup(
      <TitleTreatmentLogo
        alt=""
        as="h3"
        draggable={false}
        loading="eager"
        look={IN_BOX}
        src={SRC}
        title="Breaking Bad"
      />,
    );

    expect(html).toMatch(/<h3[^>]*><img/);
    expect(html).toContain('alt=""');
    expect(html).toContain('draggable="false"');
    expect(html).toContain('loading="eager"');
  });
});
