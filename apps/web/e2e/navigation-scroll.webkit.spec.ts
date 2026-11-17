import { historyScrollSuite } from './helpers/historyScrollSuite';

/** History's tab, Back and Forward in WebKit (the owner's Safari) */
for (const [width, height] of [
  [390, 844],
  [1440, 900],
] as const) {
  historyScrollSuite(width, height);
}
