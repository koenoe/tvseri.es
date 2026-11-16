import { chevronDownGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

/**
 * "3 episodes ▾" (`.cntb`): the row's disclosure. Its hit area covers the
 * whole row (the board opens the row on a click anywhere); the ⋯ and a tag
 * sit above it.
 */
export default function CountToggle({
  controls,
  count,
  onToggle,
  open,
  show,
}: Readonly<{
  controls: string;
  count: number;
  onToggle: () => void;
  open: boolean;
  show: string;
}>) {
  const label = `${count} episodes of ${show}`;
  return (
    <button
      aria-controls={controls}
      aria-expanded={open}
      aria-label={label}
      className="inline-flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-full bg-white/8 pr-2.5 pl-3 text-meta font-semibold text-white after:absolute after:inset-0 after:rounded-12 max-md:h-7 max-md:pr-2 max-md:pl-2.5 max-md:text-caption max-md:font-semibold"
      onClick={onToggle}
      type="button"
    >
      {count} episodes
      <Icon
        className="transition-transform duration-200 ease-[cubic-bezier(.2,.8,.2,1)] [[aria-expanded=true]>&]:rotate-180"
        glyph={chevronDownGlyph}
        size={16}
      />
    </button>
  );
}
