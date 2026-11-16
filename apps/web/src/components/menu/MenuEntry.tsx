import Link from 'next/link';

import SignOutForm from '@/components/auth/SignOutForm';

import type { MenuItem } from './menuItems';
import SignInLink from './SignInLink';

/**
 * One word of the menu, no icon: a page, Sign in (the auth route) or
 * Sign out (the existing form post, a plain tap). The current page carries `aria-current="page"`, which draws the
 * rule and the step. A page replaces the menu's history entry.
 */
export default function MenuEntry({
  className,
  item,
  onNavigate,
}: Readonly<{
  className: string;
  item: MenuItem;
  onNavigate: () => void;
}>) {
  const current = item.current ? 'page' : undefined;

  switch (item.kind) {
    case 'signIn':
      return (
        <SignInLink className={className} onClick={onNavigate}>
          {item.label}
        </SignInLink>
      );
    case 'signOut':
      return (
        <SignOutForm className="flex">
          <button className={className} type="submit">
            {item.label}
          </button>
        </SignOutForm>
      );
    default:
      return (
        // replace: the page takes the open menu's history entry (Back
        // closes the menu, so it holds one: menuSession)
        <Link
          aria-current={current}
          className={className}
          href={item.href}
          onClick={onNavigate}
          replace
        >
          {item.label}
        </Link>
      );
  }
}
