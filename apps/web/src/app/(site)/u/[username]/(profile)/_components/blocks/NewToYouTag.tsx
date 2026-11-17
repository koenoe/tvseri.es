import { sparkleGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

type Variant = 'art' | 'hero' | 'inline';

/** Poster and hero corners: a dark glass pill over the picture */
const GLASS =
  'bg-[linear-gradient(rgb(143_220_90/0.18),rgb(143_220_90/0.18)),rgb(15_21_17/0.8)] shadow-[0_6px_14px_-6px_rgb(0_0_0/0.7)] backdrop-blur-[8px]';

const VARIANT: Readonly<Record<Variant, string>> = {
  // The poster corner, 12px/500
  art: cn(GLASS, 'h-5 gap-1 pr-[7px] pl-1.5 text-[12px] font-medium leading-5'),
  // The hero: a 32px pill that sits left of the + (`right-14`)
  hero: cn(GLASS, 'h-8 gap-1.5 pr-3 pl-[11px] text-caption font-medium'),
  // plain: in a line of text or a row, on its own flat tint
  inline:
    'h-5 gap-[5px] bg-[rgb(143_220_90/0.13)] pr-2 pl-[7px] text-[12px] font-medium leading-5',
};

/**
 * The green "New to you" tag: the show is in none of your
 * lists. `art` is the poster corner, `inline` the plain tag in a
 * row or the match card, the default the hero's.
 */
export default function NewToYouTag({
  className,
  textClassName,
  variant = 'hero',
}: Readonly<{
  className?: string;
  /** Where the words may hide (a narrow poster keeps the sparkle only) */
  textClassName?: string;
  variant?: Variant;
}>) {
  const classes = cn(
    'flex items-center rounded-full text-[#b9ec95]',
    VARIANT[variant],
    className,
  );
  // The glyph is 10px beside the poster and row tags, 13px in the hero
  const iconClass = variant === 'hero' ? undefined : 'size-2.5';
  return (
    <span className={classes} title="New to you">
      <Icon className={iconClass} glyph={sparkleGlyph} size={13} />
      <span className={textClassName}>New to you</span>
    </span>
  );
}
