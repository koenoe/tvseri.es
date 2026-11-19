import type { WatchingNow } from '@tvseri.es/schemas';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import profilePath from '@/lib/routing/profilePath';

import { BARE_ROW, FIRST_ROW, LEAD_ROW, LINE, TAG } from './rowBoxes';
import WatchingLine from './WatchingLine';

const NAME_LINE = `flex min-w-0 items-center gap-2.5 text-[16px] leading-6 font-semibold md:text-[17px] ${LINE.name}`;

/**
 * One person on the Circle, owner's and visitor's: the visitor's plain
 * circle as a lead (your own rows have none), the name with an optional
 * fact and its tags, an optional line under it, what they are watching,
 * the Follow button and the chevron. The whole row opens their profile:
 * the name's link covers it, and the Follow button sits above that.
 * Desktop is one line (lead, text, button, chevron); the phone moves the
 * button under the text. A row without a button (yourself, on someone
 * else's Circle) puts its tags there on a phone, so every row is the
 * height of its placeholder.
 */
export default function PersonRow({
  action,
  fact,
  first = false,
  lead,
  line,
  tags,
  username,
  watching,
}: Readonly<{
  action?: ReactNode;
  /** Beside the name: "59 shared series" */
  fact?: ReactNode;
  /** The page's first row: the one the placeholder spec measures */
  first?: boolean;
  lead?: ReactNode;
  line?: ReactNode;
  tags: ReadonlyArray<string>;
  username: string;
  watching: WatchingNow | null;
}>) {
  const href = profilePath(username);
  const nameTag = action ? TAG : `${TAG} max-md:hidden`;
  const boxes = lead ? LEAD_ROW : BARE_ROW;
  const rowClass = `group/person bg-white/[.035] ${boxes.row}`;
  const phoneTags = `h-8 gap-2 md:hidden ${boxes.action}`;
  const goMark = `bg-white/6 text-white/70 transition-colors group-hover/person:text-white ${boxes.go}`;
  return (
    <li
      className={rowClass}
      data-person={username}
      data-slot={first ? FIRST_ROW : undefined}
    >
      {lead}
      <div className="min-w-0">
        <div className={NAME_LINE}>
          <Link
            className="truncate outline-0 after:absolute after:inset-0 after:rounded-16 focus-visible:after:outline-2 focus-visible:after:outline-white"
            href={href}
          >
            {username}
          </Link>
          {fact}
          {tags.map((tag) => (
            <span className={nameTag} key={tag}>
              {tag}
            </span>
          ))}
        </div>
        {line}
        <WatchingLine watching={watching} />
      </div>
      {action ? (
        <div className={boxes.action}>{action}</div>
      ) : (
        <div className={phoneTags}>
          {tags.map((tag) => (
            <span className={TAG} key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <span aria-hidden="true" className={goMark}>
        <Icon glyph={chevronRightGlyph} size={16} />
      </span>
    </li>
  );
}
