import ButtonLink from '@/components/ui/button/ButtonLink';
import { arrowRightGlyph } from '@/components/ui/icon/glyphs';

/**
 * After the API accepted the deletion. The board's
 * copy says "(Demo: nothing was deleted)"; this one says what is true: you
 * are signed out and the rest goes within about half an hour.
 */
export default function DeletedNotice() {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-16 bg-white/4 p-8"
      role="status"
    >
      <b className="text-title-3">Account deleted</b>
      <span className="text-body-sm text-white/60">
        You’re signed out. Your history, lists and profile are being removed and
        will be gone within about half an hour.
      </span>
      <ButtonLink href="/" icon={arrowRightGlyph} variant="tonal">
        Go to the homepage
      </ButtonLink>
    </div>
  );
}
