import type { ReactNode } from 'react';

import cn from '@/lib/cn';

import {
  OPTION_LINE_CLASS,
  OPTION_ROW_CLASS,
  OPTION_TEXT_CLASS,
  OPTION_TITLE_CLASS,
} from './layout';

/**
 * One row of an app card's settings block: title, line, and its control.
 * On phones a control wider than a switch goes under the text, unless
 * `control` is `beside` (a short line, like Sync now's before a first sync).
 */
export default function OptionRow({
  children,
  control = 'under',
  description,
  title,
}: Readonly<{
  children?: ReactNode;
  control?: 'beside' | 'under';
  description: ReactNode;
  title: string;
}>) {
  const text = cn(
    OPTION_TEXT_CLASS,
    control === 'beside' && 'max-md:basis-auto',
  );
  return (
    <div className={OPTION_ROW_CLASS}>
      <span className={text}>
        <b className={OPTION_TITLE_CLASS}>{title}</b>
        <span className={OPTION_LINE_CLASS}>{description}</span>
      </span>
      {children}
    </div>
  );
}
