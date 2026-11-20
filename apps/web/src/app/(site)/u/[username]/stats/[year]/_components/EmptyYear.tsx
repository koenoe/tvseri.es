import Link from 'next/link';
import { HEAD_LINK } from '@/app/(site)/u/[username]/_lib/headLink';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import statsPath from '@/lib/routing/statsPath';
import { getStatsPageYears } from '@/lib/stats/getYears';

import { isUnavailable } from '@/lib/stats/loaders';
import type { SectionProps } from './types';

/**
 * A year without dated episodes: the header and tiles
 * stay (zeros against last year), the blocks give way to one quiet line and
 * a link to the newest year that has stats, in the lanes' style.
 */
export default async function EmptyYear({ user, year }: SectionProps) {
  const years = await getStatsPageYears(user.id);
  const latest = isUnavailable(years)
    ? null
    : (years.years.find((entry) => entry.year !== year && entry.episodes > 0) ??
      null);
  const latestHref = latest ? statsPath(user.username, latest.year) : '';
  const seeLatest = latest ? `See ${latest.year}` : '';
  return (
    <section className="flex flex-col items-start gap-3 rounded-16 bg-black/22 p-[18px]">
      <p className="text-body text-white/80">
        {`${user.username} has nothing logged with a date in ${year}.`}
      </p>
      {latest ? (
        <Link className={HEAD_LINK} href={latestHref}>
          {seeLatest}
          <Icon glyph={chevronRightGlyph} size={14} />
        </Link>
      ) : null}
    </section>
  );
}
