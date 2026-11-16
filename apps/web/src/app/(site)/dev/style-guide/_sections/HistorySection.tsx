import {
  heavyDiary,
  statsDaily,
  statsYears,
} from '../../../../../../e2e/stub-api/fixtures/user-profile/pg-diary.ts';
import DiaryEnd from '../../../u/[username]/(profile)/history/_components/DiaryEnd';
import DiaryMonth from '../../../u/[username]/(profile)/history/_components/DiaryMonth';
import JumpHeading from '../../../u/[username]/(profile)/history/_components/JumpHeading';
import JumpList from '../../../u/[username]/(profile)/history/_components/JumpList';
import {
  buildDiary,
  monthIndex,
  thisWeek,
} from '../../../u/[username]/(profile)/history/_lib/diary';
import Section from './Section';

/** The stub's heavy diary from June to December 2025: the bulk day, the binge, quiet days */
const FROM = Date.UTC(2025, 5, 1);
const TO = Date.UTC(2026, 0, 1);
const NOW = Date.UTC(2025, 11, 10, 12);

/**
 * The History diary's parts with the stub's heavy
 * diary: Jump to (2025 open, December white, This week), month headers,
 * day rows (open one; a bulk day) and the end note. At 390 the phone frame
 * applies (Jump to lives in the page's sheet there).
 */
export default function HistorySection() {
  const all = heavyDiary();
  const years = statsYears(all, 600);
  const items = all.filter(
    (item) => item.watchedAt >= FROM && item.watchedAt < TO,
  );
  const months = buildDiary(items, years.years);
  const index = monthIndex(years.years);
  const week = thisWeek(statsDaily(all, 2025).days, NOW);
  return (
    <Section
      id="history"
      source="PGFinal 4 · How History works 1–4"
      title="History diary"
    >
      <div className="grid items-start gap-12 md:grid-cols-[300px_minmax(0,1fr)] md:gap-16">
        <div className="max-md:hidden">
          <JumpHeading />
          <JumpList
            active="2025-12"
            basePath="/dev/style-guide"
            index={index}
            week={week}
          />
        </div>
        <div className="min-w-0">
          {months.map((month) => (
            <DiaryMonth key={month.key} month={month} />
          ))}
          <DiaryEnd more={false} owner undated={years.undated ?? 0} />
        </div>
      </div>
    </Section>
  );
}
