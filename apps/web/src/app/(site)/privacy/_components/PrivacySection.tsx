import type { ReactNode } from 'react';

import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';

/** Plain text on the page: a hairline between topics, no cards */
const SECTION =
  'flex flex-col gap-4 border-t border-white/8 pt-8 first:border-t-0 first:pt-0';

/**
 * One topic of the privacy page: a small line icon beside the heading, then
 * short lines of body text (a list when there is more than one thing).
 */
export default function PrivacySection({
  children,
  icon,
  id,
  title,
}: Readonly<{ children: ReactNode; icon: Glyph; id: string; title: string }>) {
  return (
    <section aria-labelledby={id} className={SECTION}>
      <h2 className="flex items-center gap-3 text-title-2" id={id}>
        <Icon className="text-white/60" glyph={icon} size={20} />
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-body text-white/80 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-white [&_li]:pl-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
