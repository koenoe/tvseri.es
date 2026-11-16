import type { ReactNode } from 'react';
import SectionHead from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';

/** The id of the sub-page's title, for its section's `aria-labelledby` */
export const SUBPAGE_TITLE_ID = 'subpage-title';

/**
 * A sub-page's header (shared by Library,
 * History and Circle): the title (24/32, 20/28 on a phone), the 2px rule,
 * the count at the end ("42", "4,718 episodes", "8 following · 6
 * followers"), and a 13/20 description under it, 8px down. The phone
 * frames draw no description. Pass `count` and `description` as ready
 * nodes (a streamed count sits in its own hole).
 */
export default function SubpageHeader({
  className,
  count,
  description,
  title,
}: Readonly<{
  className?: string;
  count?: ReactNode;
  description?: ReactNode;
  title: string;
}>) {
  const link =
    count === undefined ? undefined : (
      <span className="text-[14px] leading-5 whitespace-nowrap text-white/60 tabular-nums">
        {count}
      </span>
    );
  const classes = cn('flex flex-col gap-2', className);
  return (
    <header className={classes}>
      <SectionHead id={SUBPAGE_TITLE_ID} link={link} title={title} />
      {description === undefined ? null : (
        <div className="text-meta text-white/60 max-md:hidden">
          {description}
        </div>
      )}
    </header>
  );
}
