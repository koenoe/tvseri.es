'use client';

import Button from '@/components/ui/button/Button';
import CopyButton from '@/components/ui/button/CopyButton';
import { eyeGlyph, eyeOffGlyph } from '@/components/ui/icon/glyphs';
import IconSwap from '@/components/ui/icon/IconSwap';
import cn from '@/lib/cn';

import { SM_BUTTON } from '../../_lib/appButtons';
import { TOKEN_MASK } from '../_lib/webhookUrl';
import { FIELD_RING_CLASS, URL_FIELD_CLASS } from './layout';

/**
 * The webhook URL: masked until Show; Copy always copies the whole URL. The
 * token is fetched only when asked for (`usePlexUrl`).
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
  /** The whole URL for Copy, fetched if it isn't loaded (null: it couldn't be) */
  onCopy: () => Promise<string | null>;
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
      ? 'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-plex)_25%,transparent)]'
      : FIELD_RING_CLASS,
  );
  const revealed = url !== null;
  const shown = revealed ? url.slice(prefix.length) : TOKEN_MASK;
  const busy = pending ? true : undefined;
  const revealGlyph = revealed ? eyeOffGlyph : eyeGlyph;
  return (
    <div className={classes}>
      <span className="min-w-0 flex-1 truncate">
        {prefix}
        <b className="font-medium text-white">{shown}</b>
      </span>
      <Button
        aria-busy={busy}
        className={SM_BUTTON}
        onClick={onToggle}
        variant="quiet"
      >
        <IconSwap glyph={revealGlyph} size={16} />
        {revealed ? 'Hide' : 'Show'}
      </Button>
      <CopyButton
        className={SM_BUTTON}
        copied="Copied your Plex webhook URL"
        failed="Couldn’t copy your Plex URL. Try again."
        text={onCopy}
      >
        Copy
      </CopyButton>
    </div>
  );
}
