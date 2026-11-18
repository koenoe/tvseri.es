import type { ReactNode } from 'react';

import cn from '@/lib/cn';

import { OWNER_VARIANT_CLASS, VISITOR_VARIANT_CLASS } from './ownerVisitorRule';

const OWNER = cn(OWNER_VARIANT_CLASS, 'contents');
const VISITOR = cn(VISITOR_VARIANT_CLASS, 'hidden');

/**
 * Both variants of a placeholder (or any shell part that differs for the
 * owner and a visitor), one shown before the first paint (see
 * `ownerVisitorRule.ts`). `display: contents` keeps the wrapper out of the
 * layout; the hidden variant is `display: none`, so it is out of the
 * accessibility tree too.
 */
export default function OwnerVisitor({
  owner,
  visitor,
}: Readonly<{ owner: ReactNode; visitor: ReactNode }>) {
  return (
    <>
      <div className={OWNER}>{owner}</div>
      <div className={VISITOR}>{visitor}</div>
    </>
  );
}
