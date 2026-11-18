'use client';

import Link from 'next/link';

import Logo from '@/components/ui/Logo';

import { useHeaderStore } from './HeaderStoreProvider';
import useNamedHeader from './useNamedHeader';

/**
 * The lock-up, home link: 20px on a phone and in the pill, 24px in the
 * desktop bar. It stays live over the open menu; following it closes the
 * menu.
 */
export default function HeaderLogo() {
  const isPill = useHeaderStore((state) => state.mode !== 'static');
  const closeMenu = useHeaderStore((state) => state.closeMenu);
  const pageName = useNamedHeader();

  // scrolled on a phone: the page's name in place of the logo
  if (pageName !== null) {
    return (
      <span
        className="z-10 min-w-0 truncate text-body font-semibold text-white"
        data-header-name=""
      >
        {pageName}
      </span>
    );
  }

  return (
    <Link
      aria-label="tvseri.es home"
      className="z-10 -my-2 flex items-center py-2"
      href="/"
      onClick={closeMenu}
    >
      <Logo className={isPill ? undefined : 'md:hidden'} size={20} />
      <Logo className={isPill ? 'hidden' : 'max-md:hidden'} size={24} />
    </Link>
  );
}
