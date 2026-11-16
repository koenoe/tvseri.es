import { keywordLanding } from '@tvseri.es/constants';
import { chipStyles } from '@/components/ui/button/buttonStyles';
import ChipLink from '@/components/ui/button/ChipLink';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import { isUnavailable } from '@/lib/cache/unavailable';
import landingPath from '@/lib/routing/landingPath';

import { loadKeywords } from '../../_data/loaders';

const chip = 'h-auto py-2 font-medium';

/**
 * The show's keywords beside the storyline (pd-kw). A keyword of a theme's
 * set links to the theme's landing (`/theme/{slug}`), the keyword of a genre
 * TMDB only has as a keyword to its genre landing (`/genre/horror`); the rest
 * have no page to go to, so they stay plain chips, dimmer than the linked
 * ones.
 */
export default async function Keywords({
  seriesId,
}: Readonly<{ seriesId: number }>) {
  const keywords = await loadKeywords(seriesId);
  if (isUnavailable(keywords) || keywords.length === 0) {
    return null;
  }
  const plain = chipStyles({
    // dimmer than a theme's chip, so the ones that lead somewhere stand out
    className: `${chip} cursor-default text-white/60 hover:border-white/5`,
  });
  return (
    <ul
      aria-label="Keywords"
      className="flex flex-wrap gap-2 self-start"
      data-slot="keywords"
    >
      {keywords.map((keyword) => {
        const landing = keywordLanding(Number(keyword.id));
        const href = landing && landingPath(landing.type, landing.slug);
        return (
          <li key={keyword.id}>
            {href ? (
              <ChipLink className={chip} href={href}>
                {keyword.name}
              </ChipLink>
            ) : (
              <span className={plain}>{keyword.name}</span>
            )}
          </li>
        );
      })}
    </ul>
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
    <ul
      aria-hidden="true"
      className="flex animate-ghost flex-wrap gap-2 self-start"
      data-placeholder="keywords"
    >
      {GHOST_WIDTHS.map((width, index) => (
        <li
          className={`h-[38px] rounded-full ${GHOST_FILL} ${width}`}
          key={index}
        />
      ))}
    </ul>
  );
}
