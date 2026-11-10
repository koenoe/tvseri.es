import { CalendarOutlineIcon } from '@/components/Icons/CalendarOutlineIcon';
import MetaDate from '@/components/MetaDate/MetaDate';
import MetaItem from '@/components/MetaRow/MetaItem';
import MetaRow from '@/components/MetaRow/MetaRow';
import { formatMetaDateParts } from '@/utils/formatDate';

import RuntimeMetaItem from './RuntimeMetaItem';

/**
 * Air date and runtime of an episode, as shown on the episode tiles and the
 * per-show watch history: when, then how much. A missing or invalid air date
 * and a runtime of 0 are skipped.
 */
export default function EpisodeMeta({
  airDate,
  className,
  runtime,
}: Readonly<{
  airDate?: string | null;
  className?: string;
  runtime?: number | null;
}>) {
  // Date-only (UTC midnight), so it formats in UTC and is safe on the server
  const dateParts = airDate ? formatMetaDateParts(airDate, 'date') : null;
  const date = dateParts ? (
    <MetaDate monthDay={dateParts.monthDay} year={dateParts.year} />
  ) : null;

  return (
    <MetaRow className={className}>
      <MetaItem icon={CalendarOutlineIcon}>{date}</MetaItem>
      <RuntimeMetaItem minutes={runtime} />
    </MetaRow>
  );
}
