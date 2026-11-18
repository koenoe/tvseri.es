'use client';

import { usePathname } from 'next/navigation';

import { fillLoginHref, loginHref } from '@/auth/loginHref';
import ButtonContent from '@/components/ui/button/ButtonContent';
import {
  BUTTON_ICON_SIZE,
  type ButtonSize,
  buttonStyles,
} from '@/components/ui/button/buttonStyles';
import { userGlyph } from '@/components/ui/icon/glyphs';

/**
 * “Sign in” that comes back here: links to the login route with the current
 * path as `returnTo`, and the query too once the link is about to be used
 * (`fillLoginHref`; reading search params here would suspend the error
 * view). A plain <a>, not next/link: it leaves the app for the auth
 * service, so there's nothing to prefetch.
 *
 * @example
 * <LoginButton />
 */
export default function LoginButton({
  className,
  size = 'md',
}: Readonly<{ className?: string; size?: ButtonSize }>) {
  const pathname = usePathname();
  const href = loginHref(pathname);
  const classes = buttonStyles({ className, size, variant: 'primary' });
  return (
    <a
      className={classes}
      href={href}
      onClick={fillLoginHref}
      onFocus={fillLoginHref}
      onPointerEnter={fillLoginHref}
    >
      <ButtonContent icon={userGlyph} iconSize={BUTTON_ICON_SIZE[size]}>
        Sign in
      </ButtonContent>
    </a>
  );
}
