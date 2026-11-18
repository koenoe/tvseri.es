'use client';

import Link from 'next/link';

import { useHeaderStore } from '@/components/header/HeaderStoreProvider';
import { HEADER_TEXT_LINK } from '@/components/header/headerIconButton';
import { SIGNED_IN_ONLY, SIGNED_OUT_ONLY } from '@/components/ui/viewer/reveal';
import cn from '@/lib/cn';
import profilePath from '@/lib/routing/profilePath';

import SignInLink from './SignInLink';
import useMenuUsername from './useMenuUsername';

/*
 * lowercase by CSS (the text and its accessible name stay as they
 * are), the header controls' hover and 44px target (`HEADER_TEXT_LINK`).
 */
const TEXT = cn(
  'text-body-sm font-medium text-white lowercase',
  HEADER_TEXT_LINK,
);
// the username truncates: 150px on phones, 200px on desktop, and shorter
// when the bar is narrower (min-w-0 lets it shrink in the header's row)
const NAME = 'min-w-0 truncate max-w-[150px] md:max-w-[200px]';

const SIGN_IN = cn('block', TEXT);
const HANDLE = cn('hidden before:content-(--viewer-handle)', TEXT, NAME);
const PROFILE_LINK = cn('block', TEXT, NAME);

const signedOutOnly = { [SIGNED_OUT_ONLY]: '' };
const signedInOnly = { [SIGNED_IN_ONLY]: '' };

/**
 * The header's username (a link to the profile) or Sign in. Both stay
 * clickable while the menu is open, and following either closes it.
 *
 * The server never knows who is signed in (the header HTML is the same for
 * everyone), so until hydration this draws both and the root pre-paint
 * script picks one: Sign in as itself, or the username from
 * `--viewer-handle` (`lib/viewer/viewerHintsScript`), at the same place and width.
 */
export default function Username() {
  const username = useMenuUsername();
  const closeMenu = useHeaderStore((state) => state.closeMenu);

  if (username === undefined) {
    return (
      <span className="contents" data-viewer-pending="">
        <SignInLink className={SIGN_IN} {...signedOutOnly} />
        <span aria-hidden="true" className={HANDLE} {...signedInOnly} />
      </span>
    );
  }

  if (!username) {
    return <SignInLink className={SIGN_IN} onClick={closeMenu} />;
  }

  const href = profilePath(username);
  return (
    <Link className={PROFILE_LINK} href={href} onClick={closeMenu}>
      {username}
    </Link>
  );
}
