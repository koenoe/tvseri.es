import type { ReactNode } from 'react';

import {
  OPTION_LINE_CLASS,
  OPTION_ROW_CLASS,
  OPTION_TEXT_CLASS,
  OPTION_TITLE_CLASS,
} from './layout';

/** One row of an app card's settings block: title, line, and its control. */
export default function OptionRow({
  children,
  description,
  title,
}: Readonly<{
  children?: ReactNode;
  description: ReactNode;
  title: string;
}>) {
  return (
    <div className={OPTION_ROW_CLASS}>
      <span className={OPTION_TEXT_CLASS}>
        <b className={OPTION_TITLE_CLASS}>{title}</b>
        <span className={OPTION_LINE_CLASS}>{description}</span>
      </span>
      {children}
    </div>
  );
}
