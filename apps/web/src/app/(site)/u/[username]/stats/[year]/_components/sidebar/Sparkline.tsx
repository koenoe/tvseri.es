import cn from '@/lib/cn';
import { weekLinesLayout } from '../../_charts/weekLines';

type Props = Readonly<{
  /** Episodes per visual week (53) */
  values: ReadonlyArray<number>;
  /** The week in progress; later weeks are faint stubs */
  currentWeek?: number;
  /** `row`: the sidebar's 22px lines; `pill`: the phone pill's 20 × 12 */
  size: 'row' | 'pill';
}>;

const SIZES = {
  pill: {
    bar: 'min-w-0 flex-1 bg-current opacity-60',
    box: 'flex h-3 w-5 items-end',
    height: 12,
    stub: 1,
  },
  row: {
    bar: 'block flex-1 rounded-[1px]',
    box: 'flex h-[22px] items-end gap-px',
    height: 22,
    stub: 2,
  },
} as const;

/**
 * A year's weeks as tiny bars: heights from
 * `weekLinesLayout`, one colour for every week so far and a faint stub for
 * each week still to come. Flex slots, so the 53 lines share any width.
 */
export default function Sparkline({ currentWeek, size, values }: Props) {
  const { bar, box, height, stub } = SIZES[size];
  const lines = weekLinesLayout({ currentWeek, height, stub, values });
  const bars = lines.map((line, index) => {
    const future = currentWeek !== undefined && index > currentWeek;
    const tone = size === 'pill' ? '' : future ? 'bg-white/8' : 'bg-white/35';
    return {
      className: cn(bar, tone),
      key: index,
      style: { height: `${line.height}px` },
    };
  });
  return (
    <span aria-hidden className={box}>
      {bars.map((item) => (
        <i className={item.className} key={item.key} style={item.style} />
      ))}
    </span>
  );
}
