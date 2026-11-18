import type { StubRoute } from '../types';

const SIZE: Readonly<Record<string, readonly [number, number]>> = {
  backdrop: [1280, 720],
  logo: [500, 160],
  'logo-block': [500, 160],
  poster: [300, 450],
  still: [454, 254],
};

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * Placeholder art: a muted tile with its name. A `logo` is white letters on
 * a transparent ground; a `logo-block` is a filled block (white letters on
 * blue), a logo the API marks `logoSilhouette: false`.
 */
export const routes: ReadonlyArray<StubRoute> = [
  {
    handle: ({ params }) => {
      const kind = params.kind ?? 'poster';
      const label = (params.file ?? '').replace(/\.svg$/, '');
      const [width, height] = SIZE[kind] ?? [300, 450];
      const hue = [...label].reduce(
        (total, char) => (total * 31 + char.charCodeAt(0)) % 360,
        7,
      );
      const isLogo = kind === 'logo' || kind === 'logo-block';
      const fill =
        kind === 'logo'
          ? 'transparent'
          : kind === 'logo-block'
            ? '#1d3fbf'
            : `hsl(${hue} 25% 35%)`;
      const text = isLogo ? '#fff' : 'rgba(255,255,255,.55)';
      return {
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${fill}"/><text x="50%" y="50%" fill="${text}" font-family="sans-serif" font-size="${isLogo ? 64 : 22}" font-weight="${isLogo ? 800 : 400}" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text></svg>`,
        headers: { 'content-type': 'image/svg+xml' },
      };
    },
    path: '/img/:kind/:file',
  },
];
