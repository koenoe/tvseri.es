import Link from 'next/link';
import type { ReactNode } from 'react';
import { chevronLeftGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { SETTINGS_INDEX } from '../_lib/sections';

/**
 * A section's heading: below `lg` the top bar with ‹ Settings and the
 * title; beside the sidebar the title-1 heading and its lede. Static: it is
 * part of the section's shell.
 */
export default function SectionHeader({
  lede,
  title,
}: Readonly<{ lede: ReactNode; title: string }>) {
  return (
    <>
      <div className="-mx-gutter -mt-6 grid h-12 grid-cols-[96px_minmax(0,1fr)_96px] items-center border-white/6 border-b px-2 lg:hidden">
        <Link
          className="inline-flex h-10 items-center gap-0.5 px-1.5 text-body-sm font-medium text-white/80 hover:text-white"
          href={SETTINGS_INDEX}
        >
          <Icon glyph={chevronLeftGlyph} size={20} />
          Settings
        </Link>
        <h1 className="truncate text-center text-body font-semibold">
          {title}
        </h1>
      </div>
      <div className="flex flex-col gap-2 max-lg:hidden">
        <h2 className="text-title-1">{title}</h2>
        <p className="max-w-160 text-body text-white/60">{lede}</p>
      </div>
    </>
  );
}
