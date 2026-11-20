import { calendarGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

/**
 * The calendar beside Mark season and Mark all watched. `label` is the
 * picker's own question, so a screen reader hears what the dialog will ask.
 * 44px tall to the thumb; 5px at the sides, half the rows' narrowest gap.
 */
export default function DateButton({
  disabled = false,
  label,
  onClick,
}: Readonly<{ label: string; disabled?: boolean; onClick: () => void }>) {
  const blocked = disabled || undefined;
  return (
    <button
      aria-disabled={blocked}
      aria-label={label}
      className="relative flex h-7.5 min-w-7.5 cursor-pointer after:absolute after:-inset-x-[5px] after:-inset-y-[7px] items-center justify-center rounded-8 px-1.5 text-white/70 transition-colors hover:bg-white/8 hover:text-white aria-disabled:cursor-default aria-disabled:opacity-30"
      onClick={disabled ? undefined : onClick}
      title="When?"
      type="button"
    >
      <Icon glyph={calendarGlyph} size={15} />
    </button>
  );
}
