import { keywordLanding } from '@tvseri.es/constants';
import ChipCloud, {
  ChipCloudGhost,
  type CloudChip,
} from '@/components/ui/button/ChipCloud';
import { isUnavailable } from '@/lib/cache/unavailable';
import landingPath from '@/lib/routing/landingPath';

import { loadKeywords } from '../../_data/loaders';

/**
 * The show's keywords beside the storyline. A keyword of a theme's
 * set links to the theme's landing (`/theme/{slug}`), the keyword of a genre
 * TMDB only has as a keyword to its genre landing (`/genre/horror`); the rest
 * have no page to go to, so they stay plain chips (`ChipCloud`).
 */
export default async function Keywords({
  seriesId,
}: Readonly<{ seriesId: number }>) {
  const keywords = await loadKeywords(seriesId);
  if (isUnavailable(keywords) || keywords.length === 0) {
    return null;
  }
  const chips = keywords.map((keyword): CloudChip => {
    const landing = keywordLanding(Number(keyword.id));
    return {
      href: landing ? landingPath(landing.type, landing.slug) : undefined,
      key: String(keyword.id),
      label: keyword.name,
    };
  });
  return (
    <ChipCloud
      chips={chips}
      className="self-start"
      label="Keywords"
      slot="keywords"
    />
  );
}

/**
 * Widths of the ghost chips: the typical show's twelve keywords (the e2e rig's
 * median show), so the rows break where the real chips' do at every column
 * width, not only at desktop's.
 */
const GHOST_WIDTHS = [
  'w-[103px]',
  'w-[115px]',
  'w-[87px]',
  'w-[110px]',
  'w-[86px]',
  'w-[85px]',
  'w-[62px]',
  'w-[68px]',
  'w-[108px]',
  'w-[83px]',
  'w-[54px]',
  'w-[90px]',
] as const;

/**
 * The keywords' space while they load: twelve chips, the typical show's
 * rows (a show with more or fewer closes up or grows by rows of 38px).
 */
export function KeywordsSkeleton() {
  return (
    <ChipCloudGhost
      className="self-start"
      name="keywords"
      widths={GHOST_WIDTHS}
    />
  );
}
