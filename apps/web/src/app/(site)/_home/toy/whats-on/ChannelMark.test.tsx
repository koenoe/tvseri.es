import type { WhatsOnChannel } from '@tvseri.es/schemas';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ChannelMark from './ChannelMark';

const network = (
  logo: string,
  logoKind: 'icon' | 'wordmark',
): WhatsOnChannel['network'] => ({
  id: 453,
  logo,
  logoKind,
  name: 'Hulu',
  wordmark: 'https://image.tmdb.org/t/p/w500/hulu-wordmark.png',
});

describe('ChannelMark', () => {
  it('draws the square service icon', () => {
    const html = renderToStaticMarkup(
      <ChannelMark
        network={network('https://image.tmdb.org/t/p/w92/hulu.jpg', 'icon')}
      />,
    );
    expect(html).toContain('hulu.jpg');
  });

  it('never draws the wordmark: an empty square keeps the rows in line', () => {
    const html = renderToStaticMarkup(
      <ChannelMark
        network={network(
          'https://image.tmdb.org/t/p/w500/hulu-wordmark.png',
          'wordmark',
        )}
      />,
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('aria-hidden="true"');
  });
});
