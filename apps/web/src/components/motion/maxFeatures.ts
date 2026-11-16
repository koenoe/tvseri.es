import { domMax } from 'motion/react';

/**
 * Motion's full feature set: `domAnimation` plus layout animations and
 * drag/pan. Only `loadMaxFeatures` (MotionProvider) imports it, so it is its
 * own chunk and never part of a route's first-load JS.
 */
export default domMax;
