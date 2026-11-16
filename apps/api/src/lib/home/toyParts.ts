/**
 * Pure pieces of the toy of the day (`toy.ts`), kept apart so they can be
 * tested without TMDB.
 */

/**
 * What's on: the TMDB watch providers whose square icon stands for a channel
 * on the remote, every channel's (the first one TMDB lists wins: Paramount+
 * is listed under its tiers too). A channel whose icon TMDB doesn't list
 * gets none; the remote never draws its wordmark.
 */
const CHANNEL_ICON_PROVIDERS: ReadonlyMap<
  number,
  ReadonlyArray<number>
> = new Map([
  [213, [8]], // Netflix
  [3186, [1899]], // HBO Max
  [2552, [350]], // Apple TV
  [4330, [531, 2303, 2616]], // Paramount+ (Premium, Essential)
  [1024, [9]], // Prime Video
  [453, [15]], // Hulu
]);

/** The square service icon for a channel, or undefined when TMDB has none */
export const channelIcon = (
  networkId: number,
  providers: ReadonlyArray<Readonly<{ id: number; logo: string }>>,
): string | undefined =>
  (CHANNEL_ICON_PROVIDERS.get(networkId) ?? [])
    .map((id) => providers.find((provider) => provider.id === id)?.logo)
    .find((logo) => !!logo);

/**
 * A channel's two marks: on the remote its square icon (`logo`, `logoKind`
 * 'icon'; without one 'wordmark', which the remote leaves out); in the
 * screen's caption the wordmark alone (`wordmark`, '' without one: the name
 * is written)
 */
export const channelMarks = (
  networkId: number,
  providers: ReadonlyArray<Readonly<{ id: number; logo: string }>>,
  wordmark: string,
): Readonly<{
  logo: string;
  logoKind: 'icon' | 'wordmark';
  wordmark: string;
}> => {
  const icon = channelIcon(networkId, providers);
  return icon
    ? { logo: icon, logoKind: 'icon', wordmark }
    : { logo: wordmark, logoKind: 'wordmark', wordmark };
};

/** A place's shows with the day's pick first, then the others in table order */
export const placeShowOrder = (
  showIds: ReadonlyArray<number>,
  pick: number,
): ReadonlyArray<number> => {
  const first = showIds[pick];
  return first === undefined
    ? showIds
    : [first, ...showIds.filter((_, index) => index !== pick)];
};
