'use client';

import { usePathname } from 'next/navigation';

import ButtonContent from '@/components/ui/button/ButtonContent';
import {
  BUTTON_ICON_SIZE,
  type ButtonSize,
  buttonStyles,
} from '@/components/ui/button/buttonStyles';
import { userGlyph } from '@/components/ui/icon/glyphs';

/**
 * “Sign in” that comes back here: links to the login route with the current
 * path as `returnTo`. A plain <a>, not next/link: it leaves the app for the
 * auth service, so there's nothing to prefetch.
 *
 * @example
 * <LoginButton />
 */
export default function LoginButton({
  className,
  size = 'md',
}: Readonly<{ className?: string; size?: ButtonSize }>) {
  const pathname = usePathname();
  const href = `/api/auth/login?returnTo=${encodeURIComponent(pathname)}`;
  const classes = buttonStyles({ className, size, variant: 'primary' });
  return (
    <a className={classes} href={href}>
      <ButtonContent icon={userGlyph} iconSize={BUTTON_ICON_SIZE[size]}>
        Sign in
      </ButtonContent>
    </a>
  );
}
