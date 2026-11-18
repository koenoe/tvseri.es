/**
 * The PreferredImages table's key: one item per show (`SERIES#<id>`).
 * Never change the format: stored picks keep the one they were written with.
 */
const PREFIX = 'SERIES#';

export const preferredImagesPk = (seriesId: number | string) =>
  `${PREFIX}${seriesId}`;

/** The show id of a `SERIES#<id>` key */
export const seriesIdOfPk = (pk: string) => Number(pk.slice(PREFIX.length));
