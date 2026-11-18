import { infoGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

/**
 * Several episodes marked at one moment (a whole season at once).
 * Not on a phone, where the code line keeps its room for the toggle.
 */
export default function BulkBadge() {
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center gap-[5px] rounded-6 bg-white/8 px-2 text-[11px] font-semibold leading-5 text-white/80 max-md:hidden">
      <Icon glyph={infoGlyph} size={13} />
      Marked in one go
    </span>
  );
}
