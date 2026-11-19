'use client';

import Button from '@/components/ui/button/Button';
import { clockGlyph, copyGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { showToast } from '@/components/ui/toast/showToast';
import cn from '@/lib/cn';

import { SM_BUTTON } from '../../_lib/appButtons';

/** One digit's slot: the sign-in code page's and the extension's look */
const SLOT_CLASS =
  'flex h-16 w-14 items-center justify-center rounded-12 bg-black/32 text-numeral tabular-nums shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]';

/**
 * The link code as four large slots, the shape the extension asks for, with
 * the time left and Copy beside it. Copy confirms with a toast, as Plex's
 * URL does (the toaster is a live region, so a screen reader hears it too).
 */
export default function LinkCodeField({
  code,
  countdown,
  expired,
}: Readonly<{ code: string; countdown: string; expired: boolean }>) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast({ title: 'Copied your code' });
    } catch {
      // No clipboard (an insecure context, a refused permission): the code
      // is on screen to type
      showToast({
        title: 'Couldn’t copy the code. Type it in.',
        tone: 'error',
      });
    }
  };

  const slotsClass = cn(
    'flex gap-2',
    expired ? 'text-white/60 line-through' : 'text-white',
  );
  const digits = [...code];
  const label = `Your code: ${digits.join(' ')}`;
  const left = expired ? 'Expired' : `Valid for ${countdown}`;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <p aria-label={label} className={slotsClass}>
        {digits.map((digit, index) => (
          // The code's digits repeat, so their place is the key
          <span aria-hidden="true" className={SLOT_CLASS} key={index}>
            {digit}
          </span>
        ))}
      </p>
      <div className="flex flex-col items-start gap-2">
        <span className="flex items-center gap-1.5 text-meta text-white/60 tabular-nums">
          <Icon glyph={clockGlyph} size={13} />
          {left}
        </span>
        <Button
          className={SM_BUTTON}
          disabled={expired}
          icon={copyGlyph}
          onClick={copy}
          variant="tonal"
        >
          Copy
        </Button>
      </div>
    </div>
  );
}
