import type { Premiere, TvSeries } from '@tvseri.es/schemas';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Countdown from './Countdown';

const premiere = (id: number, title: string): Premiere => ({
  date: '2026-11-17',
  daysAway: 3,
  isBig: true,
  kind: 'new-series',
  release: 'weekly',
  seasonNumber: 1,
  series: {
    backdropImage: `https://image.tmdb.org/t/p/w1280/backdrop-${id}.jpg`,
    description: `The overview of ${title}.`,
    genres: [],
    id,
    slug: title.toLowerCase().replaceAll(' ', '-'),
    title,
    titleTreatmentImage: `https://image.tmdb.org/t/p/w500/logo-${id}.png`,
  } as unknown as TvSeries,
});

const first = premiere(1, 'Northern Lights');
const three = [first, premiere(2, 'Harbour Town'), premiere(3, 'Slow Burn')];

/** One element's markup, from its opening tag to its matching close */
const element = (html: string, marker: string) => {
  const start = html.lastIndexOf('<', html.indexOf(marker));
  const tag = html.slice(start + 1).match(/^\w+/)?.[0] ?? 'div';
  let depth = 0;
  const pattern = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  pattern.lastIndex = start;
  for (let match = pattern.exec(html); match; match = pattern.exec(html)) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) {
      return html.slice(start, match.index + match[0].length);
    }
  }
  return html.slice(start);
};

/** The first premiere's foreground and the label: the card's left side */
const leftSide = (html: string) => ({
  body: element(html, 'data-countdown-body="0"').replace(
    /aria-hidden="[^"]*"|inert=""/g,
    '',
  ),
  label: element(html, 'id="countdown-label"'),
});

describe('Countdown', () => {
  it('draws the same left side with one premiere or three', () => {
    const one = renderToStaticMarkup(<Countdown premieres={[first]} />);
    const many = renderToStaticMarkup(<Countdown premieres={three} />);

    expect(leftSide(one)).toEqual(leftSide(many));
    // no synopsis in either: the count, the logo and the facts carry it
    expect(many).not.toContain('The overview of Northern Lights.');
  });

  it('heads the card with the moment label, the section’s heading', () => {
    const html = renderToStaticMarkup(<Countdown premieres={three} />);
    const label = element(html, 'id="countdown-label"');

    expect(label.startsWith('<h2')).toBe(true);
    expect(label).toContain('Next big premiere');
    expect(html).not.toContain('backdrop-blur-');
  });

  it('only the foot differs: "Open" with one premiere, the pills with three', () => {
    const one = renderToStaticMarkup(<Countdown premieres={[first]} />);
    const many = renderToStaticMarkup(<Countdown premieres={three} />);

    expect(one).toContain('>Open Northern Lights<');
    expect(one).not.toContain('aria-label="Next premieres"');
    expect(many).toContain('aria-label="Next premieres"');
    expect(many).not.toContain('>Open Northern Lights<');
  });

  it('shades each backdrop in its picture’s colour; no colour keeps the near-black', () => {
    const red = {
      ...first,
      series: { ...first.series, backdropColor: '#79251d' },
    };
    const unknown = {
      ...first,
      series: { ...first.series, backdropColor: '#000000' },
    };

    const colored = element(
      renderToStaticMarkup(<Countdown premieres={[red]} />),
      'data-countdown-backdrop="0"',
    );
    const plain = element(
      renderToStaticMarkup(<Countdown premieres={[unknown]} />),
      'data-countdown-backdrop="0"',
    );

    expect(colored).toContain(
      '--picture-shade:color-mix(in srgb, #79251d 50%, black)',
    );
    expect(plain).not.toContain('--picture-shade:');
  });
});
