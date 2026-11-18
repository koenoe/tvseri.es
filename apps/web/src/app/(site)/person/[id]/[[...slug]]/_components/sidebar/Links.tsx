import type { PersonLink } from '@tvseri.es/schemas';

import { externalGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { isUnavailable } from '@/lib/cache/unavailable';
import { loadLinks } from '@/lib/person/loaders';
import externalHref from '@/lib/routing/externalHref';
import SocialIcon, { hasSocialIcon, SOCIAL_LABELS } from './SocialIcon';

const ROW = 'flex items-center gap-2';
const RING =
  'box-border border-2 border-white/20 transition-colors hover:border-white/50';
const IMDB = `${RING} inline-flex h-8 items-center gap-1.5 rounded-full pr-2.5 pl-3 text-caption font-medium`;
const CIRCLE = `${RING} inline-flex size-8 shrink-0 items-center justify-center rounded-full`;

const imdbUrl = (imdbId: string) => `https://www.imdb.com/name/${imdbId}/`;

function ImdbLink({ href, name }: Readonly<{ href: string; name: string }>) {
  const label = `${name} on IMDb`;
  return (
    <a
      aria-label={label}
      className={IMDB}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      IMDb
      {/* contrast-exempt: the external-link icon */}
      <Icon className="text-white/40" glyph={externalGlyph} size={13} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Before the links load: the IMDb pill from the person, same height. */
export function LinksFallback({
  imdbId,
  name,
}: Readonly<{ imdbId?: string; name: string }>) {
  if (!imdbId) {
    return null;
  }
  const href = imdbUrl(imdbId);
  return (
    <div className={ROW}>
      <ImdbLink href={href} name={name} />
    </div>
  );
}

/**
 * The Socials row: an IMDb pill, then a 32px circle
 * per social account. Wikidata is a source, not a social: not drawn.
 */
export default async function Links({
  id,
  imdbId,
  name,
}: Readonly<{ id: number; imdbId?: string; name: string }>) {
  const links = await loadLinks(id);
  if (isUnavailable(links)) {
    return <LinksFallback imdbId={imdbId} name={name} />;
  }
  // Only http(s) links from the upstream data
  const safe = links.flatMap((link: PersonLink) => {
    const url = externalHref(link.url);
    return url ? [{ ...link, url }] : [];
  });
  const imdb = safe.find((link) => link.type === 'imdb');
  const socials = safe.filter((link) => hasSocialIcon(link.type));
  const imdbHref = imdb?.url ?? (imdbId ? imdbUrl(imdbId) : undefined);
  if (!imdbHref && socials.length === 0) {
    return null;
  }
  return (
    <div className={ROW}>
      {imdbHref ? <ImdbLink href={imdbHref} name={name} /> : null}
      {socials.map((link) => {
        const label = SOCIAL_LABELS[link.type] ?? link.type;
        const linkLabel = `${name} on ${label}`;
        return (
          <a
            aria-label={linkLabel}
            className={CIRCLE}
            href={link.url}
            key={link.type}
            rel="noopener noreferrer"
            target="_blank"
            title={label}
          >
            <SocialIcon type={link.type} />
          </a>
        );
      })}
    </div>
  );
}
