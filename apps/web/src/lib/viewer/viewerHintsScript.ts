import { USER_DISPLAY_COOKIE_NAME } from '@/auth/cookies';
import {
  applyOwnerVisitor,
  OWNER_VISITOR_SHEET,
  VISITOR_RULE,
} from '@/components/ui/viewer/ownerVisitorRule';
import { SIGNED_IN_RULE } from '@/components/ui/viewer/reveal';
import {
  applyRegionHint,
  REGION_HINT_KEY,
  REGION_HINT_MAX_AGE_MS,
  REGION_HINT_VERSION,
  readRegionHint,
} from '@/lib/region/regionHint';
import { regionLine } from '@/lib/region/regionLine';

import {
  applyHtmlHints,
  LIBRARY_HINT_KEY,
  LIBRARY_HINT_VERSION,
  PLEX_HINT_KEY,
  PLEX_HINT_VERSION,
  PROMPT_HINT_KEY,
  PROMPT_HINT_VERSION,
} from './htmlHints';
import { readCookieUser } from './readCookieUser';

const json = JSON.stringify;

/**
 * The root layout's pre-paint script, the only one, inlined in every
 * document: it reads the display cookie once (`readCookieUser`, the header's
 * reading too) and storage once, and runs every rule that must be right at
 * the first paint, outside what React hydrates (attributes of `<html>` and
 * adopted stylesheets):
 *
 * - signed in (`u`): `SIGNED_IN_RULE`, the signed-in-only space
 *   (`components/ui/viewer/reveal`), and on a profile the owner's or a
 *   visitor's placeholders (`applyOwnerVisitor`);
 * - `applyHtmlHints`: Home, Stats and Plex placeholders, and the show page's
 *   first-tracking prompt (`data-show-prompt`);
 * - `applyRegionHint`: Discover's "Streaming in …" line;
 * - `--viewer-handle`: the header's username slot draws the name before
 *   hydration. `JSON.stringify` gives a CSS string a value can't
 *   leave (quotes and backslashes escaped, no raw newline);
 * - `data-flat-glass` on 4 cores or fewer: the open menu's glass without
 *   the blur, the pill without its distortion.
 *
 * Small on purpose (every HTML response carries it): the functions are
 * embedded by `.toString()` (minified in a production build) and share one
 * cookie read, one storage handle and one stylesheet helper (`b` adds a
 * sheet, `a` one with `:root` custom properties). The stylesheet rules run
 * first, in their own `try`, so a failing hint can't leave signed-in space
 * hidden. The size is pinned in `viewerHintsScript.test.ts`.
 */
export const viewerHintsScript = `(function(){var d=document,r=d.documentElement,n=navigator,l=location,s=null,u=(${readCookieUser})(d.cookie,${json(USER_DISPLAY_COOKIE_NAME)}),b=function(c){var t=new CSSStyleSheet;t.replaceSync(c);d.adoptedStyleSheets=[...d.adoptedStyleSheets,t];return t},a=function(c){b(":root{"+c+"}")};try{u&&b(${json(SIGNED_IN_RULE)});(${applyOwnerVisitor})(l.pathname,u,b,${json(VISITOR_RULE)},${json(OWNER_VISITOR_SHEET)},window)}catch(e){}try{s=localStorage}catch(e){}(${applyHtmlHints})(r,l.pathname,u,s,new Date().getUTCFullYear(),${json(LIBRARY_HINT_KEY)},${LIBRARY_HINT_VERSION},${json(PLEX_HINT_KEY)},${PLEX_HINT_VERSION},${json(PROMPT_HINT_KEY)},${PROMPT_HINT_VERSION});(${applyRegionHint})(r,a,s,u,Date.now(),n.language||"",${json(REGION_HINT_KEY)},${REGION_HINT_VERSION},${REGION_HINT_MAX_AGE_MS},${readRegionHint},${regionLine});n.hardwareConcurrency<=4&&r.setAttribute("data-flat-glass","");try{u&&a("--viewer-handle:"+JSON.stringify(u))}catch(e){}})();`;
