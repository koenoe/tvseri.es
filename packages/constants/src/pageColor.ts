/**
 * The version of the API's page colour rule (`groundColor` in the API: white
 * at 60% reads on the colour at 4.5:1). It is part of the API's cache key for
 * detected colours (`detectDominantColorFromImage:v2:`) and of the web's
 * request URL (`?colour=2`) for every response that carries a page colour,
 * so a change to the rule reaches past the CDN's copies (a day for a series,
 * a year for `GET /dominant-color`).
 */
export const PAGE_COLOR_VERSION = 2;
