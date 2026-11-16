import type { TvSeries, WhatsOnChannel } from '@tvseri.es/schemas';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ChannelCaption from './ChannelCaption';

const channel = (wordmark: string): WhatsOnChannel => ({
  network: {
    id: 213,
    logo: 'https://image.tmdb.org/t/p/w92/netflix-icon.png',
    logoKind: 'icon',
    name: 'Netflix',
    wordmark,
  },
  series: {
    genres: [],
    id: 42,
    slug: 'black-mirror',
    title: 'Black Mirror',
  } as unknown as TvSeries,
});

/** The caption's top row: "CH 01" and the service */
const topRow = (html: string) => html.slice(0, html.indexOf('<div'));

describe('ChannelCaption', () => {
  it('draws the network’s wordmark white in the name’s place, its alt the name', () => {
    const html = renderToStaticMarkup(
      <ChannelCaption
        channel={channel(
          'https://image.tmdb.org/t/p/w500/netflix-wordmark.png',
        )}
        networkHref={undefined}
        number="01"
      />,
    );
    const top = topRow(html);
    expect(top).toContain('alt="Netflix"');
    expect(top).toContain('netflix-wordmark.png');
    expect(top).toContain('brightness-0 invert');
    // the remote's square icon stays on the remote
    expect(top).not.toContain('netflix-icon.png');
    expect(top).not.toContain('>Netflix<');
  });

  it('writes the name when the network has no wordmark', () => {
    const html = renderToStaticMarkup(
      <ChannelCaption
        channel={channel('')}
        networkHref={undefined}
        number="01"
      />,
    );
    const top = topRow(html);
    expect(top).toContain('>Netflix</span>');
    expect(top).not.toContain('<img');
  });

  it('writes the title as a block, so its room above the facts holds', () => {
    const html = renderToStaticMarkup(
      <ChannelCaption
        channel={channel('')}
        networkHref={undefined}
        number="01"
      />,
    );
    const title = html.match(/<span class="([^"]*)">Black Mirror<\/span>/);
    expect(title?.[1]?.split(' ')).toEqual(
      expect.arrayContaining(['block', 'mb-5.5', 'md:mb-6.5']),
    );
  });
});
