import { loginHref } from '@/auth/loginHref';
import ButtonContent from '@/components/ui/button/ButtonContent';
import {
  BUTTON_ICON_SIZE,
  buttonStyles,
} from '@/components/ui/button/buttonStyles';
import { refreshGlyph } from '@/components/ui/icon/glyphs';

/**
 * “Try again” after a failed sign-in: a new login that comes back to where
 * the first one was going. A plain <a> (it leaves for the auth server); the
 * path is validated here and again by the login route.
 */
export default function TryAgainLink({
  returnTo,
}: Readonly<{ returnTo: unknown }>) {
  const href = loginHref(returnTo);
  const classes = buttonStyles({ variant: 'primary' });
  return (
    <a className={classes} href={href}>
      <ButtonContent icon={refreshGlyph} iconSize={BUTTON_ICON_SIZE.md}>
        Try again
      </ButtonContent>
    </a>
  );
}
