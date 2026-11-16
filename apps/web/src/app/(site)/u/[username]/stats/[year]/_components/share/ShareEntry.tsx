import Image from 'next/image';

import { shareGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { cardPath } from '../../_card/cardRequest';
import type { StatsUser } from '../../_data/loaders';
import ShareTrigger from './ShareTrigger';
import { getShareCard } from './shareInfo';

const ENTRY =
  '-mx-3 grid w-[calc(100%+24px)] cursor-pointer grid-cols-[64px_minmax(0,1fr)_20px] items-center gap-3.5 rounded-12 px-3 py-2.5 text-left text-white transition-colors duration-150 hover:bg-white/5';

/**
 * The sidebar's share entry (STD_Recommended `.st-sh-entry`, finished years
 * only): the card's thumbnail, "nina’s 2025, as a card" / "Square or story"
 * and the share icon. Opens the share dialog.
 */
export default async function ShareEntry({
  user,
  year,
}: Readonly<{ user: StatsUser; year: number }>) {
  const card = await getShareCard(user, year);
  const thumb = cardPath(user.username, year, {
    format: 'square',
    theme: 'dark',
    thumb: true,
  });
  return (
    <ShareTrigger
      card={card}
      className={ENTRY}
      label={`Share ${user.username}’s ${year} as an image`}
      mode="dialog"
    >
      <span className="relative block size-16 overflow-hidden rounded-8 bg-[#161b1c]">
        <Image
          alt=""
          className="block"
          height={64}
          src={thumb}
          unoptimized
          width={64}
        />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-body-sm font-semibold">
          {user.username}’s {year}, as a card
        </span>
        <span className="truncate text-caption text-white/60">
          Square or story
        </span>
      </span>
      <span className="text-white/60">
        <Icon glyph={shareGlyph} size={16} />
      </span>
    </ShareTrigger>
  );
}
