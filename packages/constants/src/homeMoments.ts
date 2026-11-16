/**
 * The version of Home's day builds of the feature and the toy: part of the
 * API's cache key (`home:feature:v…`, `home:toy:v…`), of the web's request
 * URL (`?v=`) and of the web's cached loader, so a change in what a day
 * draws (the rotation, a builder) reaches past every layer at once: the
 * API's stored build, the CDN's week-long copy of `GET /home/feature`, and a
 * `use cache` entry a dev server kept. Bump it whenever a day's feature or
 * toy would come out differently for the same date.
 */
export const HOME_MOMENTS_VERSION = 20;
