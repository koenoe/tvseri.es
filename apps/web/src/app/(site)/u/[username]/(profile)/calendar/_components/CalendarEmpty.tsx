import Link from 'next/link';

import { calendarGlyph, chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { libraryPath } from '@/lib/routing/profilePath';

/**
 * Nothing dated and nothing waiting for a date: a heading, one sentence and
 * the way to the library
 */
export default function CalendarEmpty({
  username,
}: Readonly<{ username: string }>) {
  const href = libraryPath(username);
  return (
    <div className="flex flex-col items-start gap-3 rounded-16 bg-black/22 p-7 max-md:p-5">
      <span className="flex size-10 items-center justify-center rounded-12 bg-white/6 text-white/75">
        <Icon glyph={calendarGlyph} size={18} />
      </span>
      <h2 className="text-title-3">Nothing coming up yet</h2>
      <p className="max-w-140 text-body-sm leading-[22px] text-pretty text-white/72">
        When a show you watch, save or finish gets a new episode or season, its
        date shows on this calendar. Renewed shows without a date wait under it.
      </p>
      <Link
        className="inline-flex h-9 items-center gap-1 rounded-10 bg-white/10 px-3.5 text-body-sm font-medium transition-colors hover:bg-white/14"
        href={href}
      >
        Your library
        <Icon glyph={chevronRightGlyph} size={13} />
      </Link>
    </div>
  );
}
