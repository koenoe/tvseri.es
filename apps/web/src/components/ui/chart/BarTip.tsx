import type { ReactNode } from 'react';

/** Where a place hangs the tip: its offset from the bar and its stacking */
export type BarTipLayout = Readonly<{ place: string }>;

/** Over the bar's middle (Stats' charts) */
const CENTRED: BarTipLayout = { place: 'left-1/2 z-30 -translate-x-1/2' };

const TIP =
  'pointer-events-none absolute bottom-[calc(100%+8px)] hidden flex-col items-center gap-0.5 whitespace-nowrap rounded-8 bg-[rgba(15,20,20,0.94)] px-2.5 py-1.5 text-caption text-white/60 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.7),inset_0_0_0_1px_rgba(255,255,255,0.08)] group-hover/bar:flex group-focus-visible/bar:flex';

/**
 * The dark tooltip over a bar (`.st-tip`): shown while its `group/bar`
 * parent is hovered or keyboard-focused. CSS only; the parent carries the
 * `aria-label` (the tip is hidden from assistive tech).
 *
 * @example
 * <span aria-label="Jan 6 – Jan 12: 13 episodes" className="group/bar relative …" tabIndex={0}>
 *   <BarTip title="13 episodes">Jan 6 – Jan 12</BarTip>
 * </span>
 */
export default function BarTip({
  children,
  layout = CENTRED,
  title,
}: Readonly<{
  children: ReactNode;
  layout?: BarTipLayout;
  title: ReactNode;
}>) {
  const classes = `${TIP} ${layout.place}`;
  return (
    <span aria-hidden className={classes}>
      <b className="font-medium text-white">{title}</b>
      <span>{children}</span>
    </span>
  );
}
