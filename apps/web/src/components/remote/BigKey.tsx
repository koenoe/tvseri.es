'use client';

import Image from 'next/image';
import { eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { useIsSignedIn } from '@/lib/marking/hooks';
import { isTmdbImage } from '@/lib/media/isTmdbImage';
import { useEpisodeDetails } from './episodeDetails';
import { markNextOnce, usePendingMark } from './inFlight';
import { type BigKeyInput, bigKey } from './keys';
import type { RemoteMarking } from './marking';
import PendingRing from './PendingRing';
import { useRemote } from './RemoteContext';
import { BIG_KEY, KEY_CHIP } from './styles';

const STILL =
  'relative flex h-15.75 w-28 shrink-0 items-center justify-center overflow-hidden rounded-6 group-data-[layout=sheet]/remote:h-20 group-data-[layout=sheet]/remote:w-36';

function Still({
  pending,
  src,
}: Readonly<{ pending: boolean; src: string | null }>) {
  if (!src) {
    // no still: the slot outlined, with the eye (it keeps the
    // key fill)
    const empty = cn(
      STILL,
      'bg-rk-key text-rk-w40 shadow-[inset_0_0_0_1px_var(--rk-line)]',
    );
    return (
      <span className={empty}>
        {pending ? <PendingRing /> : <Icon glyph={eyeGlyph} size={20} />}
      </span>
    );
  }
  const filled = cn(
    STILL,
    'bg-rk-key after:absolute after:inset-0 after:rounded-6 after:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]',
  );
  const unoptimized = !isTmdbImage(src);
  return (
    <span className={filled}>
      <Image
        alt=""
        className="object-cover"
        fill
        sizes="(max-width: 767.98px) 144px, 112px"
        src={src}
        unoptimized={unoptimized}
      />
      {pending ? (
        <span className="absolute inset-0 z-1 flex items-center justify-center bg-white/55">
          <PendingRing />
        </span>
      ) : null}
    </span>
  );
}

type Props = Omit<BigKeyInput, 'nextEpisode' | 'pending'> &
  Readonly<{ marking: RemoteMarking; seriesId: number }>;

/**
 * “Watched next episode”: the full-width key with the still of the episode it
 * marks (“S03E05 · Children”). A press marks it, shows “Marking S03E05…” with
 * the ring while the server answers, then closes (the marking core toasts).
 * Disabled with its reason when there is nothing to mark.
 */
export default function BigKey({ marking, seriesId, ...input }: Props) {
  const { close, layout, openId } = useRemote();
  // kept outside this open Remote: a reopened one still shows it
  const pending = usePendingMark(seriesId);
  const episodes = useEpisodeDetails(
    seriesId,
    marking.nextEpisode,
    input.episodes,
  );
  const signedIn = useIsSignedIn();
  const key = bigKey({
    ...input,
    episodes,
    nextEpisode: marking.nextEpisode,
    pending,
    resolving: signedIn === true,
  });
  const metaClasses = cn(
    'truncate text-meta text-rk-meta tabular-nums',
    key.disabled && 'whitespace-normal',
  );

  // an empty meta line keeps the key's height
  const meta = key.meta || '\u00a0';

  const mark = () => {
    if (key.disabled || pending) {
      return;
    }
    markNextOnce(seriesId, key.episode ?? 'next', marking.markNext).finally(
      // only the Remote this press was made in (not one opened since)
      () => close(true, openId),
    );
  };
  const busy = key.pending || undefined;
  const ariaDisabled = key.disabled || undefined;

  return (
    <button
      aria-busy={busy}
      aria-disabled={ariaDisabled}
      aria-keyshortcuts="N"
      className={BIG_KEY}
      data-remote-key=""
      onClick={mark}
      role="menuitem"
      tabIndex={-1}
      type="button"
    >
      <Still pending={key.pending} src={key.still} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-body-sm font-medium">{key.label}</span>
        <span className={metaClasses}>{meta}</span>
      </span>
      {layout === 'popover' ? (
        <span aria-hidden className={KEY_CHIP}>
          N
        </span>
      ) : null}
    </button>
  );
}
