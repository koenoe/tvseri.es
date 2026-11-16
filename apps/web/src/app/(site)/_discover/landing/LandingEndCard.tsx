import ButtonLink from '@/components/ui/button/ButtonLink';
import { arrowLeftGlyph } from '@/components/ui/icon/glyphs';
import { PAGE_COLUMN } from '@/components/ui/page/pageColumn';
import { TitleGhost } from '@/components/ui/row/RowGhosts';

import PerBreakpoint from './PerBreakpoint';

type Props = Readonly<{
  /** one plain line: "Try another genre next." */
  line: string;
  /** the title on a phone, where it reads differently */
  phoneTitle?: string;
  /** "That’s the best of crime", "That’s dystopia" */
  title: string;
  /** the title comes with the data (a page's shell before its slug is known): a bar in the title's line, the rest is static */
  titleGhost?: boolean;
}>;

/**
 * The end of a bounded landing: a title, one line
 * and only "Back to Discover" (no search button). A row
 * on desktop, stacked on a phone.
 */
export default function LandingEndCard({
  line,
  phoneTitle,
  title,
  titleGhost = false,
}: Props) {
  return (
    <section
      aria-hidden={titleGhost || undefined}
      aria-label={titleGhost ? undefined : title}
      className={PAGE_COLUMN}
    >
      <div className="flex flex-col items-start gap-4 rounded-16 bg-white/4 p-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] md:flex-row md:items-center md:justify-between md:gap-8 md:p-8">
        <div className="flex flex-col">
          <p className="text-title-3 text-white">
            {titleGhost ? (
              <TitleGhost className="h-4 w-56 md:h-4" />
            ) : (
              <PerBreakpoint desktop={title} phone={phoneTitle} />
            )}
          </p>
          <p className="mt-2 text-body-sm text-white/80">{line}</p>
        </div>
        <ButtonLink href="/discover" icon={arrowLeftGlyph} variant="outline">
          Back to Discover
        </ButtonLink>
      </div>
    </section>
  );
}
