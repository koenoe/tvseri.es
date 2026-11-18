import type { MetadataRoute } from 'next';

/**
 * The web app manifest basics: name, the
 * page ground as theme and background, the “tv.” tile. `display: browser`:
 * no install prompt and no service worker, it only names and colours a
 * shortcut someone saves to a home screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#1c2223',
    display: 'browser',
    icons: [
      { sizes: 'any', src: '/icon.svg', type: 'image/svg+xml' },
      { sizes: '180x180', src: '/apple-icon.png', type: 'image/png' },
    ],
    name: 'tvseri.es',
    short_name: 'tvseri.es',
    start_url: '/',
    theme_color: '#1c2223',
  };
}
