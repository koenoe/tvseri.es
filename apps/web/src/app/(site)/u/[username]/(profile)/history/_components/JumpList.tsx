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
import { usePillGlide } from '@/components/motion/usePillGlide';
import YearsFold from '@/components/ui/fold/YearsFold';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import type { MonthKey, JumpYear as Year } from '@/lib/profile/diary';
import { useDiaryJump } from '../_lib/useDiaryJump';
import JumpYear from './JumpYear';
import { JUMP_WEEK, JUMP_YEARS, JUMP_YEARS_FOLD } from './jumpStyles';

type Week = Readonly<{ episodes: number; last: string | null }>;

const WEEK = `${JUMP_WEEK} bg-[rgb(0_255_255/0.07)] text-body-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgb(0_255_255/0.18)]`;

const weekLine = ({ episodes, last }: Week) =>
  last ? `${plural(episodes, 'episode')} · ${last}` : 'No episodes yet';

/**
 * Jump to: This week (the owner's way back to now), then the years with
 * their episodes; the open year lists its months with episodes, and the
 * month you're reading is white. A month is a link to the list from that
 * month down (`?month=`). A new active month opens its year, whichever
 * year you opened before. Shared by the sidebar and the phone's sheet
 * (`onPick` closes the sheet). The sidebar folds the years like Stats does
 * (`fold`), keeping the year the page opened at in view; the sheet lists
 * them all.
 */
export default function JumpList({
  active,
  basePath,
  fold,
  index,
  onPick,
  week,
}: Readonly<{
  /** The month at the top of the diary, white */
  active: MonthKey | null;
  /** `/u/alex/history` */
  basePath: string;
  /**
   * The sidebar's fold: `opened` is the year the page opened at, fixed, so
   * the list doesn't grow and shrink as the scroll moves through the years
   */
  fold?: Readonly<{ opened: number | null }>;
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
  // the months' pill glides to a month pressed; a scroll moves it at once
  const years = useRef<HTMLDivElement>(null);
  const glide = usePillGlide(years, active ?? '');
  const pick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      glide();
      jump(event, onPick);
    },
    [glide, jump, onPick],
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

  const rows = index.map((year) => {
    const yearActive = activeYear === year.year ? active : null;
    const yearOpen = open === year.year;
    const row = (
      <JumpYear
        active={yearActive}
        animate={touched}
        basePath={basePath}
        key={year.year}
        onPick={pick}
        onToggle={toggle}
        open={yearOpen}
        year={year}
      />
    );
    return { row, year: year.year };
  });

  return (
    <MaxMotion>
      {week ? (
        <Link className={WEEK} href={basePath} onClick={pick}>
          <Icon className="text-cyan" glyph={calendarGlyph} size={16} />
          This week
          <span className="ml-auto text-meta font-medium text-white/60">
            {weekLine(week)}
          </span>
        </Link>
      ) : null}
      {/* one offset parent for every month's row (`usePillGlide`) */}
      <div className="relative" ref={years}>
        <LayoutGroup id={group}>
          {fold ? (
            <YearsFold
              className={JUMP_YEARS_FOLD}
              reveal={activeYear ?? null}
              rows={rows}
              selected={fold.opened}
            />
          ) : (
            <ul className={JUMP_YEARS}>
              {rows.map((item) => (
                <li key={item.year}>{item.row}</li>
              ))}
            </ul>
          )}
        </LayoutGroup>
      </div>
    </MaxMotion>
  );
}
