import { formatGrouped } from '@tvseri.es/utils';
import { loginHref } from '@/auth/loginHref';
import Button from '@/components/ui/button/Button';
import { warningGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { SMALL_BUTTON } from '../../_components/problems/styles';
import type { StopReason } from '../_lib/runChunks';

const LOGIN = loginHref('/settings/import');

const HEAD: Readonly<Record<StopReason, string>> = {
  conflict: 'it was undone or replaced by a newer import',
  failed: 'the connection dropped',
  unauthenticated: 'your session expired',
  undoing: 'your last import is still being undone',
};

/**
 * "Import stopped at 1,204 of 1,877: your session expired.": what was saved, and Continue from the last chunk. Signing in
 * again opens in a new tab, so this page (and the file) stays.
 */
export default function StoppedBanner({
  onContinue,
  onStartAgain,
  reason,
  saved,
  total,
}: Readonly<{
  onContinue: () => void;
  onStartAgain: () => void;
  reason: StopReason;
  saved: number;
  total: number;
}>) {
  const head = `Import stopped at ${formatGrouped(saved)} of ${formatGrouped(total)}: ${HEAD[reason]}.`;
  const savedLine = `The ${formatGrouped(saved)} are saved.`;
  const canContinue = reason !== 'conflict';
  const onClick = canContinue ? onContinue : onStartAgain;
  const label = canContinue ? 'Continue' : 'Start again';
  return (
    <div
      className="flex items-center gap-4 rounded-16 bg-[rgb(255_120_120/0.08)] px-6 py-4 shadow-[inset_0_0_0_1px_rgb(255_120_120/0.28)] max-md:flex-wrap"
      role="alert"
    >
      <Icon className="shrink-0" glyph={warningGlyph} size={16} />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <b className="text-body-sm font-semibold">{head}</b>
        <span className="text-meta leading-5 text-white/80">
          {savedLine}{' '}
          {reason === 'unauthenticated' ? (
            <>
              <a
                className="underline underline-offset-2 hover:text-white"
                href={LOGIN}
                rel="noopener"
                target="_blank"
              >
                Sign in again
              </a>{' '}
              and it carries on from there.
            </>
          ) : canContinue ? (
            'Continue carries on from there.'
          ) : (
            'Start again to import the rest.'
          )}
        </span>
      </span>
      <Button
        className={SMALL_BUTTON}
        onClick={onClick}
        size="xs"
        variant="tonal"
      >
        <span className="text-body-sm">{label}</span>
      </Button>
    </div>
  );
}
