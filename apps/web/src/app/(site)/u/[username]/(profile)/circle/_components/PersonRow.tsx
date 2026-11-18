import type { WatchingNow } from '@tvseri.es/schemas';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import profilePath from '@/lib/routing/profilePath';

import { ACTION, FIRST_ROW, GO, LINE, ROW } from './rowBoxes';
import WatchingLine from './WatchingLine';

const TAG =
  'inline-flex h-[22px] shrink-0 items-center rounded-6 bg-white/10 px-2 text-[11px] leading-5 font-semibold whitespace-nowrap text-white/85';

const PERSON_ROW = `group/person bg-white/[.035] ${ROW}`;
const NAME_LINE = `flex min-w-0 items-center gap-2.5 text-[16px] leading-6 font-semibold md:text-[17px] ${LINE.name}`;
const PHONE_TAGS = `h-8 gap-2 md:hidden ${ACTION}`;
const GO_MARK = `bg-white/6 text-white/70 transition-colors group-hover/person:text-white ${GO}`;

/**
 * One person on the Circle, owner's and visitor's: the lead (match ring or
 * the visitor's plain circle), the name with its tags, an optional line
 * under it, what they are watching, the Follow button and the chevron. The
 * whole row opens their profile: the name's link covers it, and the Follow
 * button sits above that. Desktop is one line of four columns; the phone
 * moves the button under the text. A row without a button (yourself, on
 * someone else's Circle) puts its tags there on a phone, so every row is
 * the height of its placeholder.
 */
export default function PersonRow({
  action,
  first = false,
  lead,
  line,
  tags,
  username,
  watching,
}: Readonly<{
  action?: ReactNode;
  /** The page's first row: the one the placeholder spec measures */
  first?: boolean;
  lead: ReactNode;
  line?: ReactNode;
  tags: ReadonlyArray<string>;
  username: string;
  watching: WatchingNow | null;
}>) {
  const href = profilePath(username);
  const nameTag = action ? TAG : `${TAG} max-md:hidden`;
  return (
    <li
      className={PERSON_ROW}
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
        <div className={ACTION}>{action}</div>
      ) : (
        <div className={PHONE_TAGS}>
          {tags.map((tag) => (
            <span className={TAG} key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <span aria-hidden="true" className={GO_MARK}>
        <Icon glyph={chevronRightGlyph} size={16} />
      </span>
    </li>
  );
}
