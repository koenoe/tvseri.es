import Link from 'next/link';

import { importGlyph, linkGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';

import { HISTORY_PILL, PILL_ROW } from './layout';

function Pill({
  glyph,
  href,
  label,
}: Readonly<{ glyph: Glyph; href: string; label: string }>) {
  return (
    <Link className={HISTORY_PILL} href={href}>
      <Icon glyph={glyph} size={15} />
      {label}
    </Link>
  );
}

/** Your history elsewhere: a file import, or Plex */
export default function HistoryLinks() {
  return (
    <div className={PILL_ROW}>
      <Pill glyph={importGlyph} href="/settings/import" label="Import a file" />
      <Pill glyph={linkGlyph} href="/settings/plex" label="Connect Plex" />
    </div>
  );
}
