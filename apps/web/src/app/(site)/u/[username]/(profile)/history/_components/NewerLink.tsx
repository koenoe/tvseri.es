import { arrowUpGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

/**
 * "↑ Newer: April 2024" above a jumped list: loads the
 * month above with the reader's place held, instead of the list growing
 * upward under the finger.
 */
export default function NewerLink({
  busy,
  onLoad,
  title,
}: Readonly<{ busy: boolean; onLoad: () => void; title: string }>) {
  return (
    <button
      aria-busy={busy || undefined}
      className="mb-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-12 bg-white/4 text-meta font-semibold transition-colors hover:bg-white/7 aria-busy:opacity-60"
      onClick={onLoad}
      type="button"
    >
      <Icon glyph={arrowUpGlyph} size={16} />
      Newer: {title}
    </button>
  );
}
