import { pickRollTests } from './helpers/pickRoll';

/**
 * Pick one for me's roll (the pile forms in .36s, the
 * spring lands by 1.12s), frame by frame on a production build
 * (`helpers/pickRoll.ts`). `pick-roll.webkit.spec.ts` runs it in WebKit.
 */
pickRollTests();
