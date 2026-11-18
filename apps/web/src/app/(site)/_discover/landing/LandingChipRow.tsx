import 'server-only';

import RowError from '@/components/ui/row/RowError';
import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';

import type { ChipTab } from '../data/rowSources';
import { keywordLabel } from './format';
import LandingRow from './LandingRow';
import type { RowLoader } from './planRow';

type Props = Readonly<{
  id: string;
  /** this row's index in `loaders` */
  index: number;
  loaders: ReadonlyArray<RowLoader>;
  /** the slug's tabs from the facts' chips (`chipTabs`), a keyword or theme each */
  loadTabs: (slug: string) => Promise<ReadonlyArray<ChipTab> | Unavailable>;
  slug: string;
  /** the switch's group name */
  switchLabel: string;
  title: string;
}>;

/**
 * A poster row with a switch of keyword tabs (Genre's by kind, Theme's
 * Next door): the tabs labelled as chips (`keywordLabel`), the failed row
 * when the facts are `Unavailable`, nothing without tabs. Put it in a
 * `LandingRowSlot` with `switcher`.
 */
export default async function LandingChipRow({
  id,
  index,
  loaders,
  loadTabs,
  slug,
  switchLabel,
  title,
}: Props) {
  const found = await loadTabs(slug);
  if (isUnavailable(found)) {
    return <RowError id={id} state="unavailable" title={title} />;
  }
  if (found.length === 0) {
    return null;
  }
  const labels = found.map((tab) => ({
    key: tab.key,
    label: keywordLabel(tab.name),
  }));
  return (
    <LandingRow
      id={id}
      index={index}
      loaders={loaders}
      switchLabel={switchLabel}
      tabs={labels}
      title={title}
    />
  );
}
