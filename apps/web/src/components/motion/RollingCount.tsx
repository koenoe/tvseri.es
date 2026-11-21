'use client';

import { formatGrouped } from '@tvseri.es/utils';

import RollingNumber from './RollingNumber';

/**
 * A count in a line of text that rolls when this tab's actions move it
 * ("5,341 episodes" after a season is marked): the drawn digits roll,
 * hidden from screen readers, which read the settled number beside them.
 * Not a live region: the change isn't announced, the line just reads true.
 */
export default function RollingCount({ value }: Readonly<{ value: number }>) {
  return (
    <>
      <span className="sr-only">{formatGrouped(value)}</span>
      <RollingNumber value={value} />
    </>
  );
}
