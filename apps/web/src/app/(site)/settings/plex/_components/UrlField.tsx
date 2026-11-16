'use client';

import Button from '@/components/ui/button/Button';
import { copyGlyph, eyeGlyph, skippedGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';

import { SM_BUTTON } from '../../_lib/appButtons';
import { TOKEN_MASK } from '../_lib/webhookUrl';
import { URL_FIELD_CLASS } from './layout';

/**
 * The webhook URL: masked until Show, and Copy always
 * copies the whole URL. The token itself is fetched only when asked for
 * (`usePlexUrl`). Show/Hide carries the eye (the eye stays for
 * visibility, in settings too).
 */
export default function UrlField({
  connected,
  onCopy,
  onToggle,
  pending,
  prefix,
  url,
}: Readonly<{
  /** On the connected (amber) panel */
  connected: boolean;
  onCopy: () => void;
  onToggle: () => void;
  /** The URL is being fetched */
  pending: boolean;
  prefix: string;
  /** The full URL while shown, else null (dots) */
  url: string | null;
}>) {
  const classes = cn(
    URL_FIELD_CLASS,
    connected
      ? 'shadow-[inset_0_0_0_1px_rgb(229_160_13/0.25)]'
      : 'shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]',
  );
  const revealed = url !== null;
  const shown = revealed ? url.slice(prefix.length) : TOKEN_MASK;
  const busy = pending ? true : undefined;
  return (
    <div className={classes}>
      <span className="min-w-0 flex-1 truncate">
        {prefix}
        <b className="font-medium text-white">{shown}</b>
      </span>
      <Button
        aria-busy={busy}
        className={SM_BUTTON}
        icon={revealed ? skippedGlyph : eyeGlyph}
        onClick={onToggle}
        variant="quiet"
      >
        {revealed ? 'Hide' : 'Show'}
      </Button>
      <Button
        className={SM_BUTTON}
        icon={copyGlyph}
        onClick={onCopy}
        variant="tonal"
      >
        Copy
      </Button>
    </div>
  );
}
