import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';

/** The list's first rows (its 264px window holds six and a half) */
const ROWS = [0, 1, 2, 3, 4, 5, 6];

const PANEL = cn(
  '-mt-4 flex h-87 flex-col gap-3 rounded-16 bg-[#141a1b] p-4',
  PULSE,
);

/**
 * The country list's place while its code loads (348px): the panel without its shadow and ring, the filter field and the
 * first rows (flag, name, code) as flat ghosts.
 */
export default function ComboboxSkeleton() {
  return (
    <div aria-hidden="true" className={PANEL}>
      <Ghost className="h-10 shrink-0 rounded-10" />
      <div className="flex h-66 flex-col overflow-hidden">
        {ROWS.map((row) => (
          <span
            className="grid h-10 shrink-0 grid-cols-[28px_minmax(0,1fr)_30px_18px] items-center gap-3 px-3"
            key={row}
          >
            <Ghost className="h-4 w-6 rounded-2" />
            <TextLine className="text-body" width="w-32" />
            <TextLine className="text-caption" width="w-6" />
          </span>
        ))}
      </div>
    </div>
  );
}
