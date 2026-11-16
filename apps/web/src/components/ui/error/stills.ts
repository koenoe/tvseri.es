import type { StaticImageData } from 'next/image';

import cheers from './stills/cheers.webp';
import friends from './stills/friends.webp';
import itcrowd from './stills/itcrowd.webp';
import lost from './stills/lost.webp';
import severance from './stills/severance.webp';
import stranger from './stills/stranger.webp';
import xfiles from './stills/xfiles.webp';

/**
 * A still from a show everyone knows, bundled (never from TMDB at runtime:
 * the error pages must work when TMDB or the API is down). `ground` is the
 * colour the page and scrims fade into, measured from the still's calm
 * area. Positions: desktop frame, phone frame (the top 520px).
 */
export type ErrorStill = Readonly<{
  credit: string;
  ground: string;
  id: string;
  image: StaticImageData;
  phonePosition: string;
  position: string;
  quote?: string;
}>;

/** One of these per 404, picked once per cache period. */
export const NOT_FOUND_STILLS = [
  {
    credit: 'Lost · Jack, S03E22',
    ground: '#121813',
    headline: 'This page is lost.',
    id: 'lost',
    image: lost,
    phonePosition: '52% 30%',
    position: 'center 30%',
    quote: '“We have to go back.”',
  },
  {
    credit: 'The X-Files · the opening titles',
    ground: '#161d14',
    headline: 'The truth is out there. This page isn’t.',
    id: 'xfiles',
    image: xfiles,
    phonePosition: '50% 40%',
    position: 'center 40%',
  },
  {
    credit: 'Stranger Things · S01E03 · Holly, Jolly',
    ground: '#141315',
    headline: 'This page went missing. We asked the lights.',
    id: 'stranger',
    image: stranger,
    phonePosition: '50% 40%',
    position: 'center 40%',
  },
] as const satisfies ReadonlyArray<ErrorStill & Readonly<{ headline: string }>>;

export type NotFoundStill = (typeof NOT_FOUND_STILLS)[number];

/** 401: “Where everybody knows your name.” */
export const SIGN_IN_STILL: ErrorStill = {
  credit: 'Cheers · the theme song',
  ground: '#16191d',
  id: 'cheers',
  image: cheers,
  phonePosition: '78% 40%',
  position: 'center 40%',
  quote: '“Where everybody knows your name.”',
};

/** 401 on someone's profile: Mark heading to the severed floor. */
export const PROFILE_STILL: ErrorStill = {
  credit: 'Severance · S01E01 · Good News About Hell',
  ground: '#0f2129',
  id: 'severance',
  image: severance,
  phonePosition: '50% 50%',
  position: 'center 50%',
};

/** 403 (admins only): the same Severance still, no quote. */
export const FORBIDDEN_STILL: ErrorStill = PROFILE_STILL;

/** 500: “Have you tried turning it off and on again?” */
export const SERVER_ERROR_STILL: ErrorStill = {
  credit: 'The IT Crowd · Roy, S01E01',
  ground: '#1a1912',
  id: 'itcrowd',
  image: itcrowd,
  phonePosition: '58% 50%',
  position: 'center 50%',
};

/** Data down: “We were on a break!” (no phone frame drawn; centred). */
export const DATA_DOWN_STILL: ErrorStill = {
  credit: 'Friends · Ross, season 3',
  ground: '#16110c',
  id: 'friends',
  image: friends,
  phonePosition: '50% 60%',
  position: 'center 60%',
  quote: '“We were on a break!”',
};

/**
 * Offline: no still (it couldn't load), a CSS test card in its own
 * ground.
 */
export const TEST_CARD = { ground: '#141819', id: 'test-card' } as const;

export type ErrorBackdrop = ErrorStill | typeof TEST_CARD;
