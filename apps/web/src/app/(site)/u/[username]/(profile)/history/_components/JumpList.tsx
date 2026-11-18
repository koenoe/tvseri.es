'use client';

import { plural } from '@tvseri.es/utils';
import { LayoutGroup } from 'motion/react';
import Link from 'next/link';
import {
  type MouseEvent,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import MaxMotion from '@/components/motion/MaxMotion';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import type { MonthKey, JumpYear as Year } from '@/lib/profile/diary';
import { useDiaryJump } from '../_lib/useDiaryJump';
import JumpYear from './JumpYear';

type Week = Readonly<{ episodes: number; last: string | null }>;

const weekLine = ({ episodes, last }: Week) =>
  last ? `${plural(episodes, 'episode')} · ${last}` : 'No episodes yet';

/**
 * Jump to: This week (the owner's way
 * back to now), then the years with their episodes; the open year lists
 * its months with episodes, and the month you're reading is white. A month
 * is a link to the list from that month down (`?month=`). A new active
 * month opens its year, whichever year you opened before. Shared by the sidebar
 * and the phone's sheet (`onPick` closes the sheet).
 */
export default function JumpList({
  active,
  basePath,
  index,
  onPick,
  week,
}: Readonly<{
  /** The month at the top of the diary, white */
  active: MonthKey | null;
  /** `/u/alex/history` */
  basePath: string;
  index: ReadonlyArray<Year>;
  onPick?: () => void;
  /** This week so far, the owner only */
  week: Week | null;
}>) {
  const group = useId();
  const activeYear = active ? Number(active.slice(0, 4)) : index[0]?.year;
  const [choice, setChoice] = useState<
    Readonly<{ base: MonthKey | null; open: number | null }>
  >({ base: active, open: activeYear ?? null });
  const [touched, setTouched] = useState(false);
  // A new active month (a scroll, a jump) reopens the list at its year
  const open = choice.base === active ? choice.open : (activeYear ?? null);
  const jump = useDiaryJump();
  const pick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => jump(event, onPick),
    [jump, onPick],
  );
  // stable for the memoised years: a scroll moves `active` many times a second
  const latest = useRef({ active, open });
  useLayoutEffect(() => {
    latest.current = { active, open };
  });
  const toggle = useCallback((year: number) => {
    const now = latest.current;
    setTouched(true);
    setChoice({ base: now.active, open: now.open === year ? null : year });
  }, []);

  return (
    <MaxMotion>
      {week ? (
        <Link
          className="mb-2.5 flex h-10 items-center gap-2.5 rounded-10 bg-[rgb(0_255_255/0.07)] px-3 text-body-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgb(0_255_255/0.18)]"
          href={basePath}
          onClick={pick}
        >
          <Icon className="text-cyan" glyph={calendarGlyph} size={16} />
          This week
          <span className="ml-auto text-meta font-medium text-white/60">
            {weekLine(week)}
          </span>
        </Link>
      ) : null}
      <LayoutGroup id={group}>
        <ul className="flex flex-col gap-0.5">
          {index.map((year) => (
            <JumpYear
              active={activeYear === year.year ? active : null}
              animate={touched}
              basePath={basePath}
              key={year.year}
              onPick={pick}
              onToggle={toggle}
              open={open === year.year}
              year={year}
            />
          ))}
        </ul>
      </LayoutGroup>
    </MaxMotion>
  );
}
