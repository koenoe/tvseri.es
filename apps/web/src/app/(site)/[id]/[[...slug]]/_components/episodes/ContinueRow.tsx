'use client';

import { type EpisodeRef, episodeCode } from '@tvseri.es/schemas';

import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import useSeasonEpisodes from '@/lib/series/useSeasonEpisodes';

import Still from './Still';

/**
 * The pinned "Continue · S03E05 · Children" row with a 64×36 still, the
 * panel's only image. A click shows that season.
 * Before anything is watched it reads "Start" (there is nothing to
 * continue yet).
 */
export default function ContinueRow({
  nextUp,
  onPick,
  seriesId,
  started,
}: Readonly<{
  nextUp: EpisodeRef;
  onPick: (seasonNumber: number) => void;
  seriesId: number;
  started: boolean;
}>) {
  const verb = started ? 'Continue' : 'Start';
  const season = useSeasonEpisodes(seriesId, nextUp.seasonNumber);
  const episode = season?.episodes.find(
    (item) => item.episodeNumber === nextUp.episodeNumber,
  );
  const code = episodeCode(nextUp);
  const title = episode ? `${code} · ${episode.title}` : code;
  const pick = () => onPick(nextUp.seasonNumber);
  return (
    <button
      aria-label={`${verb}: Season ${nextUp.seasonNumber}, episode ${nextUp.episodeNumber}. Show Season ${nextUp.seasonNumber}`}
      className="flex h-15 flex-none items-center gap-3.5 rounded-12 bg-cyan/5 pr-4 pl-3 text-left shadow-[inset_0_0_0_1px_rgb(0_255_255/0.2)] hover:bg-cyan/9"
      onClick={pick}
      type="button"
    >
      <span className="relative block h-9 w-16 flex-none overflow-hidden rounded-6 bg-black">
        {episode ? <Still sizes="64px" src={episode.stillImage} /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
        <span className="text-overline text-cyan uppercase">{verb}</span>
        <b className="truncate text-body-sm font-semibold">{title}</b>
      </span>
      <Icon className="text-white/60" glyph={chevronRightGlyph} size={16} />
    </button>
  );
}
