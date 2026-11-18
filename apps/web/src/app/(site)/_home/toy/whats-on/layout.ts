/**
 * What's on's layout, shared by the toy (`WhatsOnRemote`, `Screen`,
 * `ChannelList`, `ChannelButton`, `ChannelCaption`) and its placeholder
 * (`WhatsOnGhost`). A plain module: the remote is a client island, the
 * placeholder renders on the server.
 */

/**
 * The screen beside the remote from lg (stacked below it, screen first:
 * beside a 600px screen at 768-1023 the remote is too narrow for its label
 * and the services' names). The remote's label row starts level with the
 * screen's top and its channels fill the rest of the height: tops and
 * bottoms align.
 */
export const WHATS_ON_GRID =
  'grid gap-4 lg:h-[380px] lg:grid-cols-[600px_minmax(0,1fr)] lg:gap-10';

/** The remote: the label row, 16px, the channels */
export const REMOTE = 'flex min-w-0 flex-col gap-4';

/**
 * The block's heading (36px): the on-air icon and "What's on" in
 * the overline style on the left, channel up/down at the right end
 */
export const REMOTE_HEAD = 'flex min-h-9 items-center gap-2.5';

/** Its label's place: the arrows go to the right end */
export const REMOTE_LABEL = 'mr-auto';

export const SCREEN =
  'relative h-[300px] overflow-hidden rounded-16 bg-[#0c0e0f] md:h-[380px] lg:h-auto';

/** "CH 01" top left, the service top right, on one centre line */
export const CAPTION_TOP =
  'absolute inset-x-5 top-4 z-3 flex items-start justify-between gap-4 [text-shadow:0_1px_8px_rgb(0_0_0/0.6)] md:inset-x-8 md:top-7';

/**
 * The service, top right: its top on the channel number's cap line (the
 * number's 24px box starts 3px above its digits)
 */
export const CAPTION_SERVICE = 'mt-[3px] flex h-[17px] items-start';

export const CAPTION_CHANNEL =
  'text-title-2 leading-none text-white tabular-nums';

export const CAPTION_NETWORK =
  'text-body-sm leading-none font-semibold text-white';

/**
 * The network's wordmark in the name's place: as tall as the TV icon (its
 * bottom on the icon's, like the name's baseline), up to 112 wide so a wide
 * logo stays clear of the picture; the row keeps the icon's height either
 * way, so a channel with a logo and one with a name line up
 */
export const CAPTION_WORDMARK = 'h-[15px] w-auto max-w-28';

/** The logo, the facts and the actions, bottom left */
export const CAPTION_FOOT =
  'absolute inset-x-5 bottom-5 z-3 flex flex-col items-start md:inset-x-8 md:bottom-8';

/** The logo's box (240 × 60 limit) */
export const CAPTION_LOGO =
  'relative mb-4 block h-12 w-[200px] md:mb-4.5 md:h-15 md:w-[240px]';

/**
 * The show's title written, when it has no logo: a block, so its margin
 * holds (an inline title's margin is ignored and its line would sit on the
 * facts), and a little more room under it than under a logo, as its tight
 * line sits closer to the facts
 */
export const CAPTION_TITLE =
  'mb-5.5 block text-[32px] leading-8 font-bold tracking-[-0.03em] text-white md:mb-6.5 md:text-[40px] md:leading-10';

export const CAPTION_META = 'mb-5 md:mb-6';

/** The channels: beside the screen they share the height under the label row */
export const CHANNELS = 'flex min-h-0 min-w-0 flex-col gap-1.5 lg:flex-1';

/** One channel: number, the service's mark, service and show (48px; beside the screen a share of its height) */
export const CHANNEL =
  'grid h-12 cursor-pointer lg:h-auto lg:min-h-12 lg:flex-1 grid-cols-[30px_28px_minmax(0,1fr)] items-center gap-3.5 rounded-10 px-4 text-left transition-colors duration-200 hover:bg-white/6';

export const CHANNEL_ON = 'bg-white/12 hover:bg-white/12';

/** "01" … "06": the channel numbers on the remote */
export const channelNumber = (index: number) =>
  String(index + 1).padStart(2, '0');
