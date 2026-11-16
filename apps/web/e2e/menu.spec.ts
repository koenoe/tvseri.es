import { menuSuite } from './helpers/menuSuite';

/** The menu and the sticky header (MNFinal) in Chromium: phone, 1024, 1440. */
for (const [width, height] of [
  [390, 844],
  [1024, 768],
  [1440, 900],
] as const) {
  menuSuite(width, height);
}
