/**
 * Board images, served from the folder in env `BOARD_IMG_DIR` at
 * `/img/stats/:file` (the stats route). Without the env every image is
 * missing (`null`).
 */
export const imgUrl = (name: string): string | null =>
  process.env.BOARD_IMG_DIR
    ? `http://localhost:${process.env.STUB_API_PORT ?? 3190}/img/stats/${name}`
    : null;

const BACKDROPS = new Set([
  'barry',
  'billions',
  'blackmirror',
  'celeb',
  'deptq',
  'dexres',
  'mobland',
  'mocro',
  'pitt',
  'task',
  'traitors',
  'whitelotus',
]);

export const posterOf = (art: string | undefined) =>
  art ? imgUrl(`st_p_${art}.jpg`) : null;

export const backdropOf = (art: string | undefined) =>
  art && BACKDROPS.has(art) ? imgUrl(`st_bd_${art}.jpg`) : null;

export const logoOf = (art: string | undefined) =>
  art && BACKDROPS.has(art) ? imgUrl(`st_logo_${art}.png`) : null;

/**
 * Page colours (`backdropColor`) of the shows with board art, as TMDB-like
 * picks from their backdrops, so the share card's Colour theme draws a real
 * colour (The Traitors' is #1a74b6).
 */
const BACKDROP_COLORS: Readonly<Record<string, string>> = {
  barry: '#5b6f7c',
  billions: '#7a5f32',
  blackmirror: '#1f4b5c',
  celeb: '#5c2a6b',
  deptq: '#3d4a52',
  dexres: '#7a1f1f',
  mobland: '#4a4a3a',
  mocro: '#2d3b4f',
  pitt: '#3f5a66',
  traitors: '#1a74b6',
  whitelotus: '#2f6b5a',
};

export const backdropColorOf = (art?: string) =>
  (art && BACKDROP_COLORS[art]) ?? '#1c2223';
