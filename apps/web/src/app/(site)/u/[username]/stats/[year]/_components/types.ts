import type { StatsUser } from '../_data/loaders';
import type { YearState } from '../_lib/year';

/** What every Stats section gets from the page; each loads its own data */
export type SectionProps = Readonly<{
  user: StatsUser;
  year: number;
  state: YearState;
  /** A finished year with episodes: it has a share card */
  shareable: boolean;
}>;
