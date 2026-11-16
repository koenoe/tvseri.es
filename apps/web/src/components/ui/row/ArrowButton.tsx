import { circleButtonStyles } from '@/components/ui/button/buttonStyles';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';

type Props = Readonly<{
  controls: string;
  /** at its end: dimmed and inert, but still focusable (no focus drop to body) */
  disabled: boolean;
  glyph: Glyph;
  label: string;
  onPage: () => void;
}>;

/**
 * One of the row's two round arrows, in each of its states:
 * a 40px circle with a 2px white/20 ring and a white/80 chevron; hover lifts
 * the ring to white/45 on a white/6 fill; pressed scales to .94 on white/10;
 * at an end it dims to .3 and ignores clicks. A `::before` 4px outside the
 * padding box (2px past the ring) makes the hit target 44×44.
 */
// the shared 40px circle plus a 44×44 hit target
const HIT_TARGET = 'before:absolute before:-inset-1 before:rounded-full';
// the chevron's ink and stroke are row tokens (`ROW_LOOKS`); 1.8 until a board's look sets 2
const ARROW_INK = 'text-[color:var(--row-arrow-ink,rgb(255_255_255/0.8))]';

export default function ArrowButton({
  controls,
  disabled,
  glyph,
  label,
  onPage,
}: Props) {
  const onClick = disabled ? undefined : onPage;
  const className = circleButtonStyles({
    className: `${HIT_TARGET} ${ARROW_INK}`,
    size: 40,
  });
  return (
    <button
      aria-controls={controls}
      aria-disabled={disabled}
      aria-label={label}
      className={className}
      onClick={onClick}
      type="button"
    >
      <Icon
        className="[stroke-width:var(--row-arrow-stroke,1.8)]"
        glyph={glyph}
        size={18}
      />
    </button>
  );
}
