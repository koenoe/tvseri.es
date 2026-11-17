'use client';

import type { ComponentType } from 'react';

import type { CircleButtonSize } from '@/components/ui/button/buttonStyles';
import type { IconSize } from '@/components/ui/icon/types';
import { createLoader, type Loader } from '@/lib/lazy/createLoader';
import RemoteTrigger, { remoteLabels } from './RemoteTrigger';
import type { ShowRemoteProps } from './ShowRemote';
import type { TileRemoteProps } from './TileRemote';
import useLazyRemote from './useLazyRemote';
import type { RemoteMount } from './useRemoteMount';

/** Each Remote's code, loaded once for every ⋯ that uses it */
const showRemote = createLoader(() =>
  import('./ShowRemote').then((module) => module.default),
);
const tileRemote = createLoader(() =>
  import('./TileRemote').then((module) => module.default),
);

type Look = Readonly<{
  className?: string;
  iconSize?: IconSize;
  ink?: string;
  seriesName: string;
  size: CircleButtonSize;
}>;

/**
 * A ⋯ that is the Remote's own trigger, drawn exactly as `Remote` draws it
 * (same classes, name, `aria-haspopup`, closed), without the Remote: no
 * popover or sheet, no media-query subscription, no marking hooks. The
 * first pointer-enter, focus or press loads the Remote (once for the page)
 * and swaps it in, in one commit; a click or key that started it then opens
 * it as it would have (the ⋯ reads busy until then), and focus stays on
 * the ⋯. One press is always enough. A list of hundreds of rows
 * mounts hundreds of buttons, not hundreds of Remotes. A mouse
 * preloads it on enter; a touch loads it on press and swaps it in only
 * with its click, whatever order the browser sends `pointerleave` in.
 */
function LazyRemote<P extends RemoteMount>({
  look,
  props,
  remote,
}: Readonly<{
  look: Look;
  props: P;
  remote: Loader<ComponentType<P>>;
}>) {
  const { swapped, trigger } = useLazyRemote(remote);
  if (swapped) {
    const { mount, Remote } = swapped;
    return <Remote {...props} {...mount} />;
  }
  const label = remoteLabels(look.seriesName).trigger;
  return (
    <RemoteTrigger
      {...trigger}
      aria-expanded={false}
      className={look.className}
      iconSize={look.iconSize ?? 20}
      ink={look.ink}
      label={label}
      size={look.size}
    />
  );
}

/**
 * `ShowRemote` for a list (History rows, Library tiles, profile cards): the
 * ⋯ first, the Remote on first intent. Same props.
 *
 * @example
 * <LazyShowRemote hasAired historyHref={href} seriesId={id} seriesName="The Bear" size={32} />
 */
export function LazyShowRemote(props: ShowRemoteProps) {
  const look = {
    className: props.className,
    seriesName: props.seriesName,
    size: props.size ?? 48,
  };
  return <LazyRemote look={look} props={props} remote={showRemote} />;
}

/**
 * `TileRemote` for a list (the Library's Watching and Hidden, profile rows):
 * the ⋯ first, the Remote on first intent. Same props.
 *
 * @example
 * <LazyTileRemote historyHref={href} seriesId={id} seriesName="The Bear" />
 */
export function LazyTileRemote(props: TileRemoteProps) {
  const look = {
    className: props.className,
    iconSize: props.iconSize,
    ink: props.ink,
    seriesName: props.seriesName,
    size: props.size ?? 32,
  };
  return <LazyRemote look={look} props={props} remote={tileRemote} />;
}
