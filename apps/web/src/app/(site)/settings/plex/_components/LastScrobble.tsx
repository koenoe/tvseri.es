import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';

import CodeBadge from '@/components/ui/button/CodeBadge';
import { clockGlyph, eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import TitleTreatment, {
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import { episodeCode } from '@/lib/marking/copy';

import LocalMoment from '../../_components/LocalMoment';
import { LAST_FADE } from './layout';

export type LastShow = Readonly<{
  backdrop: string | null;
  logo: string | null;
  title: string;
}>;

const FADE: CSSProperties = {
  backgroundImage: `linear-gradient(0deg, rgb(14 18 19 / ${LAST_FADE.foot}) 0%, rgb(14 18 19 / 0) 60%), linear-gradient(90deg, rgb(14 18 19 / ${LAST_FADE.left}) 0%, rgb(14 18 19 / ${LAST_FADE.middle}) 60%, rgb(14 18 19 / ${LAST_FADE.right}) 100%)`,
};

const TITLE_LOOK: TitleTreatmentLook = {
  height: 44,
  logo: 'h-11 w-auto max-w-55 object-contain object-left max-md:h-8.5',
  sizes: '220px',
  text: 'text-title-2',
  width: 220,
};

/**
 * The Last scrobble panel: the show's backdrop under a
 * dark fade from the left, its title treatment (or its name), the episode
 * (its name when the mark has one) and when (only marked plays are listed,
 * so it does not say so), and `week` at the bottom right (under the meta
 * row on a phone). The backdrop is public show data, cached.
 */
export default function LastScrobble({
  episode,
  episodeTitle,
  season,
  show,
  watchedAt,
  week,
}: Readonly<{
  episode: number;
  episodeTitle?: string;
  season: number;
  show: LastShow;
  watchedAt: number;
  week?: ReactNode;
}>) {
  const code = episodeCode({ episodeNumber: episode, seasonNumber: season });
  const hover = episodeTitle ? `${code} ${episodeTitle}` : code;
  return (
    <div className="relative flex min-h-55 items-end overflow-hidden rounded-16 p-6 max-md:min-h-47.5">
      {/* the backdrop and its fade: one layer, clipped once by the corners */}
      <div aria-hidden="true" className={PICTURE_LAYER}>
        {show.backdrop ? (
          <Image
            alt=""
            className="object-cover object-[50%_30%]"
            fill
            sizes="(min-width: 768px) 720px, 100vw"
            src={show.backdrop}
          />
        ) : null}
        <div className="absolute inset-0" style={FADE} />
      </div>
      <div className="relative z-1 flex w-full items-end gap-5 max-md:flex-col max-md:items-start max-md:gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-3 max-md:w-full">
          <span className="inline-flex items-center gap-2 text-overline uppercase text-white">
            <Icon active glyph={eyeGlyph} size={13} />
            Last scrobble
          </span>
          <TitleTreatment
            look={TITLE_LOOK}
            src={show.logo}
            title={show.title}
          />
          <MetaRow className="text-white/80 max-md:flex-col max-md:items-start max-md:gap-1">
            <span
              className="flex min-w-0 max-w-full items-center gap-2.5"
              title={hover}
            >
              <CodeBadge code={code} size="lane" />
              {episodeTitle ? (
                <span className="min-w-0 truncate">{episodeTitle}</span>
              ) : null}
            </span>
            <MetaItem icon={clockGlyph}>
              <LocalMoment at={watchedAt} style="day-first" />
            </MetaItem>
          </MetaRow>
        </div>
        {week}
      </div>
    </div>
  );
}
