import Icon from '@/components/ui/icon/Icon';
import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';

/** The 36px disc that leads a calm status line: empty, unavailable, all set */
export default function IconDisc({
  glyph,
}: Readonly<{ glyph: Glyph | ToggleGlyph }>) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/6 text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
    >
      <Icon glyph={glyph} size={16} />
    </span>
  );
}
